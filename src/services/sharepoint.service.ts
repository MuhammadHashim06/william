/**
 * SharePoint Excel Sync Service
 *
 * Writes referral data from classified STAFFING threads to the
 * SharePoint Excel table "UnstaffedRef".
 *
 * Uses src/lib/sharepoint.ts for auto-refreshing Graph auth.
 * Patterns borrowed from scripts/confirm-excel-readwrite.js and
 * scripts/test-sharepoint-excel-V2.js.
 */

import { prisma } from "@/lib/db";
import { sharePointClient } from "@/lib/sharepoint";
import { audit } from "@/repositories/audit.repo";
import { AuditAction } from "@prisma/client";
import { ExtractionService } from "./extraction.service";

// ─── SharePoint Config (from env or hardcoded defaults) ─────────────
const SP_SITE_HOSTNAME =
    process.env.SP_SITE_HOSTNAME ?? "therapydepotonline.sharepoint.com";
const SP_SITE_PATH =
    process.env.SP_SITE_PATH ?? "/sites/THERAPYDEPOTTEAMSITE";
const SP_DRIVE_NAME = process.env.SP_DRIVE_NAME ?? "STAFFING";
const SP_EXCEL_FILE_PATH =
    process.env.SP_EXCEL_FILE_PATH ??
    "/2026 STAFFING/UNSTAFFED REFERRALS 1.20.26 AI Project.xlsx";
const SP_TABLE_NAME = process.env.SP_TABLE_NAME ?? "UnstaffedRef";

// ─── The 27 columns in exact order (including hidden Column1 at end) ─
// Matches the online table exactly.  Column 12 has leading whitespace.
const TABLE_COLUMNS = [
    "UniqueIdentifier",  // 0
    "EntryDate",         // 1
    "ReferralDate",      // 2
    "CustomerName",      // 3
    "CustomerPhone",     // 4
    "CustomerEmail",     // 5
    "CustomerCompany",   // 6
    "ReferralType",      // 7
    "Status",            // 8
    "StaffedName",       // 9
    "StaffedDate",       // 10
    "ChildName",         // 11
    "  Program ID",      // 12  ← note leading spaces (matches actual header)
    "ServiceType",       // 13
    "Mandate",           // 14
    "Language",          // 15
    "DateOfBirth",       // 16
    "Notes",             // 17
    "StreetAddress",     // 18
    "City",              // 19
    "NY",                // 20  (State column)
    "ZipCode",           // 21
    "County",            // 22
    "CaregiverName",     // 23
    "PhoneNumber",       // 24
    "Location",          // 25
    "Column1",           // 26  (hidden / auto-generated)
] as const;

const EXPECTED_COL_COUNT = TABLE_COLUMNS.length; // 27

// ─── Types ──────────────────────────────────────────────────────────

type ExtractedData = {
    patient?: {
        name?: string | null;
        dob?: string | null;
        address?: string | null;
        city?: string | null;
        state?: string | null;
        zipCode?: string | null;
        county?: string | null;
    };
    caregiver?: {
        name?: string | null;
        phone?: string | null;
    };
    referral?: {
        type?: string | null;      // TDP or T2G
        serviceType?: string | null; // OT, ST, PT, etc.
        mandate?: string | null;
        programId?: string | null;
        language?: string | null;
    };
    summaryText?: string | null;
    [key: string]: unknown;
};

type SharePointMapping = {
    CustomerName: string | null;
    CustomerPhone: string | null;
    CustomerEmail: string | null;
    CustomerCompany: string | null;
    ReferralType: string | null;
    StaffedName: string | null;
    StaffedDate: string | null;
    ChildName: string | null;
    ProgramID: string | null;
    ServiceType: string | null;
    Mandate: string | null;
    Language: string | null;
    DateOfBirth: string | null;
    StreetAddress: string | null;
    City: string | null;
    State: string | null;
    ZipCode: string | null;
    County: string | null;
    CaregiverName: string | null;
    CaregiverPhone: string | null;
    Location: string | null;
    Notes: string | null;
};

type SenderInfo = {
    emailAddress?: {
        name?: string | null;
        address?: string | null;
    };
};

// ─── Helpers ────────────────────────────────────────────────────────

function safe(v: unknown): string {
    if (v === null || v === undefined) return "";
    if (typeof v === "object") {
        // Flatten object values into a single string (e.g. { street: "7 DEKALB AVE", city: "BROOKLYN" } → "7 DEKALB AVE BROOKLYN")
        try {
            const vals = Object.values(v as Record<string, unknown>)
                .filter(x => x !== null && x !== undefined && x !== "")
                .map(x => typeof x === "object" ? JSON.stringify(x) : String(x).trim());
            return vals.join(" ").trim();
        } catch {
            return JSON.stringify(v);
        }
    }
    return String(v).trim();
}

function excelSerialFromDate(d: Date): number {
    // Excel serial: days since 1899-12-30
    const epoch = new Date(1899, 11, 30);
    return Math.floor((d.getTime() - epoch.getTime()) / 86400000);
}

/**
 * Map thread.stage → human-readable status for the Excel column.
 */
function stageToStatus(stage: string): string {
    switch (stage) {
        case "OPEN_PENDING":
        case "REQUEST_CONTACT_INFO":
        case "CONTACT_INFO_SENT":
            return "Open";
        case "PROVIDER_SCHEDULED":
            return "Open";
        case "STAFFED":
            return "Staffed";
        default:
            return "Open";
    }
}

/**
 * Parse a fromJson blob to get sender name & email.
 */
function parseSender(fromJson: unknown): SenderInfo {
    if (!fromJson || typeof fromJson !== "object") return {};
    const f = fromJson as Record<string, unknown>;

    // Direct shape { emailAddress: { name, address } }
    if (f.emailAddress && typeof f.emailAddress === "object") {
        return f as SenderInfo;
    }

    // Nested shape { from: { emailAddress: {...} } }
    if (f.from && typeof f.from === "object") {
        const from = f.from as Record<string, unknown>;
        if (from.emailAddress && typeof from.emailAddress === "object") {
            return from as SenderInfo;
        }
    }

    return {};
}

/**
 * Build a unique identifier matching the pattern in the existing data:
 * "{ChildName}{ServiceType}{StreetAddress}"
 */
function buildUniqueId(
    childName: string,
    serviceType: string,
    address: string
): string {
    if (!childName) return `REF-${Date.now()}`;
    return `${childName}${serviceType}${address}`.trim();
}

/**
 * Retrieve System Data for Staffed Name/Date if extracted data is missing.
 */
async function getSystemStaffingInfo(threadId: string) {
    // Look for the Audit Log where stage changed to STAFFED

    // 1. Fetch relevant audit logs (filter payload in memory to avoid Prisma JSON issues)
    const auditLogs = await prisma.auditLog.findMany({
        where: {
            threadId,
            action: AuditAction.STAGE_CHANGED,
        },
        orderBy: { createdAt: "desc" },
    });

    let systemStaffedName = "";
    let systemStaffedDate = "";

    // Find the first log that set stage to STAFFED
    const staffedLog = auditLogs.find(log => {
        const p = log.payload as any; // untyped json
        return p?.stage === "STAFFED";
    });

    if (staffedLog) {
        // Date from audit
        systemStaffedDate = String(excelSerialFromDate(staffedLog.createdAt));

        // Name from actor
        if (staffedLog.actorUserId) {
            const user = await prisma.user.findUnique({
                where: { id: staffedLog.actorUserId },
                select: { displayName: true, email: true }
            });
            if (user) {
                systemStaffedName = user.displayName || user.email || "";
            }
        }
    } else {
        // Fallback: Check current thread owner
        const thread = await prisma.thread.findUnique({
            where: { id: threadId },
            select: { ownerUserId: true, stage: true, updatedAt: true }
        });

        if (thread && thread.stage === 'STAFFED') {
            systemStaffedDate = String(excelSerialFromDate(thread.updatedAt));

            if (thread.ownerUserId) {
                const user = await prisma.user.findUnique({
                    where: { id: thread.ownerUserId },
                    select: { displayName: true, email: true }
                });
                if (user) {
                    systemStaffedName = user.displayName || user.email || "";
                }
            }
        }
    }

    return { systemStaffedName, systemStaffedDate };
}

// ─── Resolve SharePoint file (cached for the process lifetime) ──────

let cachedDriveId: string | null = null;
let cachedFileId: string | null = null;

async function resolveExcelFile(): Promise<{ driveId: string; fileId: string }> {
    if (cachedDriveId && cachedFileId) {
        return { driveId: cachedDriveId, fileId: cachedFileId };
    }

    const client = await sharePointClient();

    // Site
    const site = await client.api(`/sites/${SP_SITE_HOSTNAME}:${SP_SITE_PATH}`).get();

    // Drive
    const drives = await client.api(`/sites/${site.id}/drives`).get();
    const drive = drives.value.find((d: any) => d.name === SP_DRIVE_NAME);
    if (!drive) throw new Error(`Drive "${SP_DRIVE_NAME}" not found`);

    // File — encode each path segment (matching confirm-excel-readwrite.js pattern)
    const encodedPath = SP_EXCEL_FILE_PATH.split("/")
        .map(encodeURIComponent)
        .join("/");
    const file = await client.api(`/drives/${drive.id}/root:${encodedPath}`).get();

    cachedDriveId = drive.id;
    cachedFileId = file.id;

    return { driveId: drive.id, fileId: file.id };
}

// ─── Core: build row from thread data ───────────────────────────────

async function buildRowForThread(threadId: string): Promise<string[] | null> {
    // Load thread with first message and all extracted attachments
    const thread = await prisma.thread.findUnique({
        where: { id: threadId },
        include: {
            messages: {
                orderBy: { receivedAt: "asc" },
                take: 1,
                include: {
                    attachments: {
                        where: { status: "EXTRACTED" },
                        select: { extractedJson: true },
                    },
                },
            },
        },
    });

    if (!thread) return null;
    if (thread.department !== "STAFFING") return null;

    const firstMsg = thread.messages[0];
    if (!firstMsg) return null;

    // 1. Collect Extracted Data
    let merged: ExtractedData = {};
    let spMap: SharePointMapping | null = null;
    let foundExtractedData = false;

    // A. From Attachments
    if (firstMsg.attachments.length > 0) {
        for (const att of firstMsg.attachments) {
            if (att.extractedJson && typeof att.extractedJson === "object") {
                foundExtractedData = true;
                const ej = att.extractedJson as any; // typed lightly for dual access

                // 1. Mapping takes precedence if found (check for new schema)
                if (ej.sharepoint_mapping) {
                    if (!spMap) spMap = ej.sharepoint_mapping;
                }

                // 2. Extracted rich data (legacy + dual)
                const rich = ej.extracted || ej; // Handle both new `{extracted:..., sharepoint_mapping:...}` and old `{...}`
                if (rich && typeof rich === "object") {
                    if (rich.patient) merged.patient = { ...merged.patient, ...rich.patient };
                    if (rich.caregiver) merged.caregiver = { ...merged.caregiver, ...rich.caregiver };
                    if (rich.referral) merged.referral = { ...merged.referral, ...rich.referral };
                    if (rich.summaryText && !merged.summaryText) merged.summaryText = rich.summaryText;
                }
            }
        }
    }

    // B. ALWAYS try body extraction to get referral data from email text
    // (Referral info like child name, address, discipline is usually in the email body)
    console.log(`[SharePoint] Attempting Body Extraction for thread ${threadId}...`);
    const bodyResult = await ExtractionService.extractFromBody(firstMsg.id);
    if (bodyResult) {
        if (bodyResult.sharepoint_mapping) {
            if (!spMap) {
                // No attachment mapping found — use body mapping entirely
                spMap = bodyResult.sharepoint_mapping;
            } else {
                // Merge: body fills gaps in attachment mapping
                const bodyMap = bodyResult.sharepoint_mapping;
                for (const key of Object.keys(bodyMap) as (keyof SharePointMapping)[]) {
                    if (!spMap[key] && bodyMap[key]) {
                        (spMap as any)[key] = bodyMap[key];
                    }
                }
            }
        }
        if (bodyResult.extracted && typeof bodyResult.extracted === "object") {
            foundExtractedData = true;
            const rich = bodyResult.extracted as ExtractedData;
            if (rich.patient) merged.patient = { ...merged.patient, ...rich.patient };
            if (rich.caregiver) merged.caregiver = { ...merged.caregiver, ...rich.caregiver };
            if (rich.referral) merged.referral = { ...merged.referral, ...rich.referral };
            if (rich.summaryText && !merged.summaryText) merged.summaryText = rich.summaryText;
        }
    }

    // 2. Fetch System Data for Enrichment
    const { systemStaffedName, systemStaffedDate } = await getSystemStaffingInfo(threadId);

    // 3. Flatten Data
    const sender = parseSender(firstMsg.fromJson);
    const senderName = safe(sender.emailAddress?.name);
    const senderEmail = safe(sender.emailAddress?.address);

    // Use extracted customer info, fallback to sender metadata
    const finalStaffedName = systemStaffedName || safe(spMap?.StaffedName);
    const finalStaffedDate = systemStaffedDate || safe(spMap?.StaffedDate);

    // Mapped Fields vs Merged Fields
    const childName = safe(spMap?.ChildName || merged.patient?.name);
    const serviceType = safe(spMap?.ServiceType || merged.referral?.serviceType);
    const streetAddress = safe(spMap?.StreetAddress || merged.patient?.address);

    // Build the 27-cell row in exact column order
    const row: string[] = [
        /* 0  UniqueIdentifier */ buildUniqueId(childName, serviceType, streetAddress),
        /* 1  EntryDate        */ thread.createdAt ? String(excelSerialFromDate(thread.createdAt)) : "",
        /* 2  ReferralDate     */ firstMsg.receivedAt ? String(excelSerialFromDate(firstMsg.receivedAt)) : "",
        /* 3  CustomerName     */ safe(spMap?.CustomerName) || senderName,
        /* 4  CustomerPhone    */ safe(spMap?.CustomerPhone) || safe(spMap?.CaregiverPhone || merged.caregiver?.phone),
        /* 5  CustomerEmail    */ safe(spMap?.CustomerEmail) || senderEmail,
        /* 6  CustomerCompany  */ safe(spMap?.CustomerCompany),
        /* 7  ReferralType     */ safe(spMap?.ReferralType || merged.referral?.type),
        /* 8  Status           */ stageToStatus(thread.stage),
        /* 9  StaffedName      */ finalStaffedName,
        /* 10 StaffedDate      */ finalStaffedDate,
        /* 11 ChildName        */ childName,
        /* 12 Program ID       */ safe(spMap?.ProgramID || merged.referral?.programId),
        /* 13 ServiceType      */ serviceType,
        /* 14 Mandate          */ safe(spMap?.Mandate || merged.referral?.mandate),
        /* 15 Language          */ safe(spMap?.Language || merged.referral?.language),
        /* 16 DateOfBirth      */ safe(spMap?.DateOfBirth || merged.patient?.dob),
        /* 17 Notes            */ safe(spMap?.Notes || merged.summaryText || (firstMsg.bodyPreview ?? "").slice(0, 200)),
        /* 18 StreetAddress    */ streetAddress,
        /* 19 City             */ safe(spMap?.City || merged.patient?.city),
        /* 20 NY               */ safe(spMap?.State || merged.patient?.state),
        /* 21 ZipCode          */ safe(spMap?.ZipCode || merged.patient?.zipCode),
        /* 22 County           */ safe(spMap?.County || merged.patient?.county),
        /* 23 CaregiverName    */ safe(spMap?.CaregiverName || merged.caregiver?.name),
        /* 24 PhoneNumber      */ safe(spMap?.CaregiverPhone || merged.caregiver?.phone),
        /* 25 Location         */ safe(spMap?.Location),
        /* 26 Column1          */ "",
    ];

    // Log the extracted data for debugging
    console.log(`[SharePoint] Row data for thread ${threadId}:`, JSON.stringify({
        childName: row[11],
        serviceType: row[13],
        programId: row[12],
        mandate: row[14],
        customerName: row[3],
        customerCompany: row[6],
        referralType: row[7],
        address: row[18],
    }));

    // Safety: ensure exactly 27 cells
    while (row.length < EXPECTED_COL_COUNT) row.push("");
    if (row.length > EXPECTED_COL_COUNT) row.length = EXPECTED_COL_COUNT;

    return row;
}

// ─── Public API ─────────────────────────────────────────────────────

export class SharePointService {
    /**
     * Finds the index of a row by its UniqueIdentifier (Col 0).
     * Returns -1 if not found.
     */
    private static async findRowIndex(uniqueId: string, driveId: string, fileId: string): Promise<number> {
        const client = await sharePointClient();
        const rowsResponse = await client
            .api(`/drives/${driveId}/items/${fileId}/workbook/tables/${SP_TABLE_NAME}/rows`)
            .select("values")
            .get();

        const rows = rowsResponse.value as { values: string[][] }[];
        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            if (r.values && r.values[0] && r.values[0][0] === uniqueId) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Sync a classified thread to the SharePoint Excel table.
     * Only writes STAFFING threads. Skips if already synced (via thread.metadata).
     * If a duplicate case exists (same UniqueIdentifier), updates the Referral Date.
     */
    static async syncThread(threadId: string): Promise<{ synced: boolean; updated?: boolean; reason?: string }> {
        // 1. Check if already synced
        const thread = await prisma.thread.findUnique({
            where: { id: threadId },
            select: { id: true, department: true, metadata: true },
        });

        if (!thread) return { synced: false, reason: "THREAD_NOT_FOUND" };
        if (thread.department !== "STAFFING") return { synced: false, reason: "NOT_STAFFING" };

        // Check metadata for previous sync
        const meta = (thread.metadata ?? {}) as Record<string, unknown>;
        if (meta.sharepointSynced === true) {
            return { synced: false, reason: "ALREADY_SYNCED" };
        }

        // 2. Build the row
        const row = await buildRowForThread(threadId);
        if (!row) return { synced: false, reason: "NO_DATA" };

        const uniqueId = row[0];

        // 3. Write to SharePoint
        try {
            const { driveId, fileId } = await resolveExcelFile();
            const client = await sharePointClient();

            // Check for duplicate in the Excel sheet
            const existingIndex = await SharePointService.findRowIndex(uniqueId, driveId, fileId);

            if (existingIndex >= 0) {
                console.log(`[SharePoint Duplicate] Found existing row at index ${existingIndex} for UniqueId ${uniqueId}. Updating Referral Date...`);

                // Update existing row:
                // We keep the original EntryDate (Col 1) but update ReferralDate (Col 2).
                // Actually, the client said "Referral date should be updated to the current referral date".
                // We'll update only the fields we want to refresh on a duplicate referral.
                
                // Get the existing row values to preserve what we don't want to change
                const existingRowResponse = await client
                    .api(`/drives/${driveId}/items/${fileId}/workbook/tables/${SP_TABLE_NAME}/rows/itemAt(index=${existingIndex})`)
                    .get();
                
                const existingValues = existingRowResponse.values[0] as string[];
                const updatedRow = [...existingValues];
                
                // Column 2 is ReferralDate
                updatedRow[2] = row[2];
                
                // Optionally update Notes to mention it was a duplicate/updated
                if (updatedRow[17]) {
                    updatedRow[17] = `[Updated ${new Date().toLocaleDateString()}] ${updatedRow[17]}`;
                }

                await client
                    .api(`/drives/${driveId}/items/${fileId}/workbook/tables/${SP_TABLE_NAME}/rows/itemAt(index=${existingIndex})`)
                    .patch({ values: [updatedRow] });

                // Sync to Local Excel
                try {
                    const { LocalExcelService } = await import("./local-excel.service");
                    await LocalExcelService.updateRow(uniqueId, updatedRow);
                } catch (localErr) {
                    console.error("[SharePointService] Local Excel update failed:", localErr);
                }

                // 4. Mark as synced in thread metadata
                await prisma.thread.update({
                    where: { id: threadId },
                    data: {
                        metadata: {
                            ...meta,
                            sharepointSynced: true,
                            sharepointSyncedAt: new Date().toISOString(),
                            sharepointUniqueId: uniqueId,
                            isDuplicateReferral: true,
                        },
                    },
                });

                await audit(AuditAction.GRAPH_INGESTED_MESSAGE, {
                    threadId,
                    payload: {
                        action: "SHAREPOINT_EXCEL_DUPLICATE_UPDATE",
                        uniqueId,
                        table: SP_TABLE_NAME,
                    },
                });

                return { synced: true, updated: true };
            }

            // Normal path: Add new row
            console.log(`[SharePoint Interaction] File: src/services/sharepoint.service.ts`);
            console.log(`Action: Adding row to Table: ${SP_TABLE_NAME}`);
            console.log(`Data: ${JSON.stringify(row)}`);

            await client
                .api(
                    `/drives/${driveId}/items/${fileId}/workbook/tables/${SP_TABLE_NAME}/rows/add`
                )
                .post({ values: [row] });

            // 3b. Sync to Local Excel
            try {
                const { LocalExcelService } = await import("./local-excel.service");
                await LocalExcelService.appendRow(row);
            } catch (localErr) {
                console.error("[SharePointService] Local Excel sync failed:", localErr);
            }

            // 4. Mark as synced in thread metadata
            await prisma.thread.update({
                where: { id: threadId },
                data: {
                    metadata: {
                        ...meta,
                        sharepointSynced: true,
                        sharepointSyncedAt: new Date().toISOString(),
                        sharepointUniqueId: uniqueId,
                    },
                },
            });

            // 5. Audit
            await audit(AuditAction.GRAPH_INGESTED_MESSAGE, {
                threadId,
                payload: {
                    action: "SHAREPOINT_EXCEL_SYNC",
                    uniqueId,
                    table: SP_TABLE_NAME,
                },
            });

            return { synced: true };
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error(`[sharepoint-sync] Failed for thread ${threadId}:`, msg);

            await audit(AuditAction.GRAPH_ERROR, {
                threadId,
                payload: {
                    action: "SHAREPOINT_EXCEL_SYNC_FAILED",
                    error: msg,
                },
            });

            return { synced: false, reason: msg };
        }
    }

    /**
     * Re-syncs an existing thread to SharePoint (Update Row).
     * Finds the row by 'UniqueIdentifier' (Col 0) and updates it.
     */
    static async updateThread(threadId: string): Promise<{ updated: boolean; reason?: string }> {
        // 1. Get thread and metadata
        const thread = await prisma.thread.findUnique({
            where: { id: threadId },
            select: { id: true, metadata: true },
        });

        if (!thread) return { updated: false, reason: "THREAD_NOT_FOUND" };

        const meta = (thread.metadata ?? {}) as Record<string, unknown>;
        const uniqueId = meta.sharepointUniqueId as string;

        if (!uniqueId) {
            return { updated: false, reason: "NO_UNIQUE_ID" };
        }

        // 2. Build the NEW row data
        const row = await buildRowForThread(threadId);
        if (!row) return { updated: false, reason: "NO_DATA_TO_BUILD" };

        try {
            const { driveId, fileId } = await resolveExcelFile();
            const client = await sharePointClient();

            // 3. Find the row index in SharePoint
            const rowIndex = await SharePointService.findRowIndex(uniqueId, driveId, fileId);

            if (rowIndex === -1) {
                return { updated: false, reason: "ROW_NOT_FOUND_IN_SP" };
            }

            console.log(`[SharePoint Update] Found row at index ${rowIndex} for UniqueId ${uniqueId}. Updating...`);

            // 4. Update the row
            await client
                .api(`/drives/${driveId}/items/${fileId}/workbook/tables/${SP_TABLE_NAME}/rows/itemAt(index=${rowIndex})`)
                .patch({ values: [row] });

            // 5. Update Local Excel
            try {
                const { LocalExcelService } = await import("./local-excel.service");
                await LocalExcelService.updateRow(uniqueId, row);
            } catch (localErr) {
                console.error("[SharePointService] Local Excel update failed:", localErr);
            }

            // 6. Audit
            await audit(AuditAction.GRAPH_INGESTED_MESSAGE, {
                threadId,
                payload: {
                    action: "SHAREPOINT_EXCEL_UPDATE",
                    uniqueId,
                    table: SP_TABLE_NAME,
                },
            });

            return { updated: true };

        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error(`[sharepoint-update] Failed for thread ${threadId}:`, msg);
            return { updated: false, reason: msg };
        }
    }
}
