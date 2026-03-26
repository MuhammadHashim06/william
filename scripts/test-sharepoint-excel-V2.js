// /**
//  * End-to-end SharePoint → Excel Table writer
//  * App-only auth using Microsoft Graph
//  */

// require('dotenv').config();

// const TENANT_ID = process.env.SHAREPOINT_TENANT_ID;
// const CLIENT_ID = process.env.SHAREPOINT_CLIENT_ID;
// const CLIENT_SECRET = process.env.SHAREPOINT_CLIENT_SECRET;

// const SITE_HOSTNAME = 'therapydepotonline.sharepoint.com';
// const SITE_PATH = '/sites/THERAPYDEPOTTEAMSITE';
// const DRIVE_NAME = 'STAFFING';  // The document library containing the file
// const EXCEL_FILE_PATH = '/2026 STAFFING/UNSTAFFED REFERRALS 1.20.26 AI Project.xlsx';
// const TABLE_NAME = 'UnstaffedRef';

// async function getAccessToken() {
//     const url = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;

//     const body = new URLSearchParams({
//         client_id: CLIENT_ID,
//         client_secret: CLIENT_SECRET,
//         grant_type: 'client_credentials',
//         scope: 'https://graph.microsoft.com/.default',
//     });

//     const res = await fetch(url, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
//         body: body.toString(),
//     });

//     const data = await res.json();

//     if (!res.ok) {
//         throw new Error(`Auth failed: ${data.error_description}`);
//     }

//     return data.access_token;
// }

// async function graphGet(token, url) {
//     const res = await fetch(`https://graph.microsoft.com/v1.0${url}`, {
//         headers: { Authorization: `Bearer ${token}` },
//     });
//     const data = await res.json();
//     if (!res.ok) throw new Error(JSON.stringify(data));
//     return data;
// }

// async function graphPost(token, url, body) {
//     const res = await fetch(`https://graph.microsoft.com/v1.0${url}`, {
//         method: 'POST',
//         headers: {
//             Authorization: `Bearer ${token}`,
//             'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(body),
//     });
//     const data = await res.json();
//     if (!res.ok) throw new Error(JSON.stringify(data));
//     return data;
// }

// async function main() {
//     console.log('🔐 Getting access token...');
//     const token = await getAccessToken();

//     console.log('🌐 Resolving SharePoint site...');
//     const site = await graphGet(
//         token,
//         `/sites/${SITE_HOSTNAME}:${SITE_PATH}`
//     );

//     console.log(`✅ Site found: ${site.name}`);

//     console.log('📁 Getting document libraries...');
//     const drives = await graphGet(token, `/sites/${site.id}/drives`);
//     const targetDrive = drives.value.find(d => d.name === DRIVE_NAME);

//     if (!targetDrive) {
//         console.log('Available libraries:');
//         drives.value.forEach(d => console.log(`  - "${d.name}"`));
//         throw new Error(`Document library "${DRIVE_NAME}" not found`);
//     }

//     console.log(`✅ Found library: "${targetDrive.name}"`);

//     console.log('📄 Locating Excel file...');
//     const encodedPath = EXCEL_FILE_PATH.split('/').map(encodeURIComponent).join('/');
//     const file = await graphGet(
//         token,
//         `/drives/${targetDrive.id}/root:${encodedPath}`
//     );

//     console.log('📊 Verifying Excel table...');
//     const tables = await graphGet(
//         token,
//         `/drives/${targetDrive.id}/items/${file.id}/workbook/tables`
//     );

//     const table = tables.value.find(t => t.name === TABLE_NAME);
//     if (!table) {
//         throw new Error(`Table "${TABLE_NAME}" not found`);
//     }

//     console.log(`✅ Table found: ${TABLE_NAME}`);

//     // Log table columns
//     console.log('\n🧱 Table columns:');
//     const columns = await graphGet(
//         token,
//         `/drives/${targetDrive.id}/items/${file.id}/workbook/tables/${TABLE_NAME}/columns`
//     );
//     columns.value.forEach((c, i) => console.log(`   ${i + 1}. ${c.name}`));

//     // Log existing rows
//     console.log('\n📋 Existing data (first 10 rows):');
//     const existingRows = await graphGet(
//         token,
//         `/drives/${targetDrive.id}/items/${file.id}/workbook/tables/${TABLE_NAME}/rows`
//     );
//     const rowCount = existingRows.value.length;
//     console.log(`   Total rows: ${rowCount}`);
//     existingRows.value.slice(0, 10).forEach((row, i) => {
//         console.log(`   Row ${i + 1}: ${JSON.stringify(row.values[0])}`);
//     });

//     console.log('✍️ Writing rows to Excel...');

//     const rows = {
//         values: [
//             ['KEY-001', 'John', 'Doe', 'Pending'],
//             ['KEY-002', 'Jane', 'Smith', 'Approved'],
//         ],
//     };

//     try {
//         await graphPost(
//             token,
//             `/drives/${targetDrive.id}/items/${file.id}/workbook/tables/${TABLE_NAME}/rows/add`,
//             rows
//         );
//         console.log('🎉 Data successfully written to Excel!');
//     } catch (writeErr) {
//         console.error('❌ Write failed:', writeErr.message);
//         if (writeErr.message.includes('403') || writeErr.message.includes('AccessDenied')) {
//             console.error('💡 Tip: Writing to Excel requires "Sites.ReadWrite.All" permission.');
//             console.error('   Please grant this permission in Azure Portal and click "Grant admin consent".');
//         }
//     }
// }

// main().catch(err => {
//     console.error('❌ Error:', err.message);
// });
















/**
 * SharePoint → Excel Table writer (with deep diagnostics)
 * App-only auth using Microsoft Graph
 *
 * What this version does:
 * 1) Prints EXACT column names (including hidden leading/trailing spaces)
 * 2) Prints column count and table range (where possible)
 * 3) Validates every row you are about to add against column count
 * 4) If mismatch: shows a per-column diff (which indexes are missing/extra)
 * 5) Improves Graph error output: status + request-id + innerError + raw body
 */

require("dotenv").config();

const TENANT_ID = process.env.SHAREPOINT_TENANT_ID;
const CLIENT_ID = process.env.SHAREPOINT_CLIENT_ID;
const CLIENT_SECRET = process.env.SHAREPOINT_CLIENT_SECRET;

const SITE_HOSTNAME = "therapydepotonline.sharepoint.com";
const SITE_PATH = "/sites/THERAPYDEPOTTEAMSITE";
const DRIVE_NAME = "STAFFING";
const EXCEL_FILE_PATH = "/2026 STAFFING/UNSTAFFED REFERRALS 1.20.26 AI Project.xlsx";
const TABLE_NAME = "UnstaffedRef";

async function getAccessToken() {
    const url = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;

    const body = new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "client_credentials",
        scope: "https://graph.microsoft.com/.default",
    });

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(`Auth failed (${res.status}): ${data.error_description || JSON.stringify(data)}`);
    }

    return data.access_token;
}

async function graphGet(token, url) {
    const res = await fetch(`https://graph.microsoft.com/v1.0${url}`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    const text = await res.text();
    let data;
    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        data = { raw: text };
    }

    if (!res.ok) {
        const requestId = res.headers.get("request-id") || res.headers.get("client-request-id");
        const diag = {
            status: res.status,
            statusText: res.statusText,
            requestId,
            error: data?.error || data,
            raw: text,
            url,
        };
        throw new Error(JSON.stringify(diag, null, 2));
    }

    return data;
}

async function graphPost(token, url, body) {
    const res = await fetch(`https://graph.microsoft.com/v1.0${url}`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    const text = await res.text();
    let data;
    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        data = { raw: text };
    }

    if (!res.ok) {
        const requestId = res.headers.get("request-id") || res.headers.get("client-request-id");
        const diag = {
            status: res.status,
            statusText: res.statusText,
            requestId,
            error: data?.error || data,
            raw: text,
            url,
            bodyPreview: body,
        };
        throw new Error(JSON.stringify(diag, null, 2));
    }

    return data;
}

/** show whitespace in header names clearly */
function showWhitespace(s) {
    // Replace spaces with visible dots and keep leading spaces obvious
    // e.g. "   Program ID" => "···Program·ID"
    return String(s).replace(/ /g, "·");
}

/** validate rows against expected column count */
function validateRows(values, expectedCols, colNames) {
    const issues = [];

    values.forEach((row, idx) => {
        const len = Array.isArray(row) ? row.length : -1;
        if (len !== expectedCols) {
            const issue = {
                rowIndex: idx,
                rowLength: len,
                expectedCols,
                row,
            };

            // Helpful diff:
            // If shorter, show which column indices would be missing.
            if (len >= 0 && len < expectedCols) {
                issue.missingColumns = colNames.slice(len).map((name, i) => ({
                    colIndex: len + i,
                    colName: name,
                }));
            }
            // If longer, show extra items beyond col count.
            if (len > expectedCols) {
                issue.extraValues = row.slice(expectedCols);
            }

            issues.push(issue);
        }
    });

    return issues;
}

async function main() {
    console.log("🔐 Getting access token...");
    const token = await getAccessToken();

    console.log("🌐 Resolving SharePoint site...");
    const site = await graphGet(token, `/sites/${SITE_HOSTNAME}:${SITE_PATH}`);
    console.log(`✅ Site found: ${site.name}`);

    console.log("📁 Getting document libraries...");
    const drives = await graphGet(token, `/sites/${site.id}/drives`);
    const targetDrive = drives.value.find((d) => d.name === DRIVE_NAME);

    if (!targetDrive) {
        console.log("Available libraries:");
        drives.value.forEach((d) => console.log(`  - "${d.name}"`));
        throw new Error(`Document library "${DRIVE_NAME}" not found`);
    }
    console.log(`✅ Found library: "${targetDrive.name}"`);

    console.log("📄 Locating Excel file...");
    const encodedPath = EXCEL_FILE_PATH.split("/").map(encodeURIComponent).join("/");
    const file = await graphGet(token, `/drives/${targetDrive.id}/root:${encodedPath}`);
    console.log(`✅ File found: ${file.name}`);

    console.log("📊 Verifying Excel table...");
    const tables = await graphGet(token, `/drives/${targetDrive.id}/items/${file.id}/workbook/tables`);
    const table = tables.value.find((t) => t.name === TABLE_NAME);
    if (!table) throw new Error(`Table "${TABLE_NAME}" not found`);
    console.log(`✅ Table found: ${TABLE_NAME}`);

    // Table info (helps to see where the table is)
    try {
        const tableInfo = await graphGet(
            token,
            `/drives/${targetDrive.id}/items/${file.id}/workbook/tables/${TABLE_NAME}`
        );
        console.log("\n🧩 Table metadata (useful for debugging):");
        console.log(`   name: ${tableInfo.name}`);
        console.log(`   id: ${tableInfo.id}`);
        if (tableInfo?.worksheet?.name) console.log(`   worksheet: ${tableInfo.worksheet.name}`);
    } catch (e) {
        console.log("\nℹ️ Could not fetch table metadata (not critical).");
    }

    // Columns
    console.log("\n🧱 Table columns (raw + whitespace-visible):");
    const columnsResp = await graphGet(
        token,
        `/drives/${targetDrive.id}/items/${file.id}/workbook/tables/${TABLE_NAME}/columns`
    );
    const colNames = columnsResp.value.map((c) => String(c.name));
    colNames.forEach((name, i) => {
        console.log(
            `   ${String(i + 1).padStart(2, "0")}. raw=${JSON.stringify(name)} | visible=${showWhitespace(name)}`
        );
    });
    const expectedCols = colNames.length;
    console.log(`\n✅ Expected column count: ${expectedCols}`);

    // Existing rows quick check
    console.log("\n📋 Existing data check (first 3 rows + row lengths):");
    const existingRows = await graphGet(
        token,
        `/drives/${targetDrive.id}/items/${file.id}/workbook/tables/${TABLE_NAME}/rows?$top=3`
    );
    existingRows.value.forEach((row, i) => {
        const arr = row.values?.[0] || [];
        console.log(`   Row ${i + 1} length: ${arr.length}`);
        console.log(`   Row ${i + 1} data: ${JSON.stringify(arr)}`);
    });

    console.log("\n✍️ Preparing rows to write...");

    /**
     * IMPORTANT:
     * Your table has ~27 columns. These test rows have only 4 columns → Graph will throw the exact error you saw.
     * To isolate shape issues, we will:
     *  - Print the outgoing row length(s)
     *  - Auto-pad to match column count (optional; toggle below)
     */

    const inputRows = [
        [
            "KEY-001",      // UniqueIdentifier
            "",             // EntryDate
            "",             // ReferralDate
            "John Doe",     // CustomerName
            "", "", "", "", // CustomerPhone..ReferralType
            "Pending",      // Status
            "", "", "",     // StaffedName, StaffedDate, ChildName
            "",             // "  Program ID" (exact column at index 12)
            "", "", "", "", // ServiceType..DateOfBirth
            "", "", "", "", // Notes..City
            "", "", "", "", // NY..CaregiverName
            "", "", "",     // PhoneNumber..Column1
        ],
        [
            "KEY-002",      // UniqueIdentifier
            "",             // EntryDate
            "",             // ReferralDate
            "Jane Doe",     // CustomerName
            "", "", "", "", // CustomerPhone..ReferralType
            "Approved",      // Status
            "", "", "",     // StaffedName, StaffedDate, ChildName
            "",             // "  Program ID" (exact column at index 12)
            "", "", "", "", // ServiceType..DateOfBirth
            "", "", "", "", // Notes..City
            "", "", "", "", // NY..CaregiverName
            "", "", "",     // PhoneNumber..Column1
        ],
    ];

    console.log("\n🧪 Outgoing rows (before any padding):");
    inputRows.forEach((r, i) => console.log(`   Row ${i + 1} length: ${r.length} | ${JSON.stringify(r)}`));

    // Toggle this:
    const AUTO_PAD_TO_MATCH_COLUMNS = false;

    let values = inputRows;

    if (AUTO_PAD_TO_MATCH_COLUMNS) {
        values = inputRows.map((row) => {
            const fixed = row.slice(0, expectedCols).map((v) => (v === null || v === undefined ? "" : v));
            while (fixed.length < expectedCols) fixed.push("");
            return fixed;
        });

        console.log("\n🧩 Outgoing rows (after auto-padding to match columns):");
        values.forEach((r, i) => console.log(`   Row ${i + 1} length: ${r.length}`));
    }

    // Validate
    const issues = validateRows(values, expectedCols, colNames);
    if (issues.length) {
        console.log("\n❌ VALIDATION FAILED: Outgoing rows do not match table column count.");
        console.log(`   Expected cols: ${expectedCols}`);
        console.log(`   Bad rows: ${issues.length}\n`);
        console.log(JSON.stringify(issues, null, 2));

        console.log(
            `\n✅ Fix options:\n` +
            `1) Send EXACTLY ${expectedCols} columns per row (best).\n` +
            `2) Or set AUTO_PAD_TO_MATCH_COLUMNS=true to pad missing cells with "".\n` +
            `3) If you are mapping by column name, note ANY header whitespace (example: ${JSON.stringify(
                colNames.find((n) => n.trim() !== n)
            )}) can break mapping. Normalize headers.\n`
        );

        // Stop before calling Graph so you get the real root cause locally
        return;
    }

    console.log("\n✅ Validation passed. Calling Graph rows/add ...");

    const payload = { values };

    const result = await graphPost(
        token,
        `/drives/${targetDrive.id}/items/${file.id}/workbook/tables/${TABLE_NAME}/rows/add`,
        payload
    );

    console.log("🎉 Data successfully written to Excel!");
    console.log("Graph response:", JSON.stringify(result, null, 2));
}

main().catch((err) => {
    console.error("\n❌ Error (detailed):\n", err.message);
});
