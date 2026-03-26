import { prisma } from "../src/lib/db";

async function main() {
    // 1. Check attachment extracted data (last 5)
    const atts = await prisma.attachment.findMany({
        where: {
            status: "EXTRACTED",
            extractedJson: { not: undefined },
        },
        select: {
            filename: true,
            extractedJson: true,
            message: {
                select: {
                    subject: true,
                    thread: {
                        select: { id: true, department: true },
                    },
                },
            },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
    });

    console.log(`\n=== EXTRACTED ATTACHMENTS (${atts.length}) ===\n`);
    for (const a of atts) {
        console.log("─".repeat(60));
        console.log("Thread:", a.message.thread.id, "| Dept:", a.message.thread.department);
        console.log("Subject:", (a.message.subject ?? "").slice(0, 80));
        console.log("File:", a.filename);
        const ej = a.extractedJson as any;
        if (ej?.sharepoint_mapping) {
            const sp = ej.sharepoint_mapping;
            console.log("  sharepoint_mapping:");
            console.log("    ChildName:", sp.ChildName ?? "(null)");
            console.log("    ServiceType:", sp.ServiceType ?? "(null)");
            console.log("    StreetAddress:", sp.StreetAddress ?? "(null)");
            console.log("    City:", sp.City ?? "(null)");
            console.log("    CustomerName:", sp.CustomerName ?? "(null)");
            console.log("    Mandate:", sp.Mandate ?? "(null)");
            console.log("    ProgramID:", sp.ProgramID ?? "(null)");
            console.log("    DateOfBirth:", sp.DateOfBirth ?? "(null)");
            console.log("    CaregiverName:", sp.CaregiverName ?? "(null)");
        } else {
            console.log("  NO sharepoint_mapping. Top-level keys:", Object.keys(ej));
        }
    }

    // 2. Check recent STAFFING threads that were synced
    console.log("\n\n=== RECENTLY SYNCED STAFFING THREADS ===\n");
    const threads = await prisma.thread.findMany({
        where: {
            department: "STAFFING",
            processingStatus: "CLASSIFIED",
        },
        select: {
            id: true,
            subject: true,
            stage: true,
            metadata: true,
            messages: {
                take: 1,
                orderBy: { receivedAt: "asc" },
                select: {
                    bodyText: true,
                    bodyPreview: true,
                    fromJson: true,
                    attachments: {
                        where: { status: "EXTRACTED" },
                        select: { filename: true, extractedJson: true },
                    },
                },
            },
        },
        orderBy: { updatedAt: "desc" },
        take: 3,
    });

    for (const t of threads) {
        console.log("─".repeat(60));
        console.log("Thread:", t.id);
        console.log("Subject:", (t.subject ?? "").slice(0, 80));
        console.log("Stage:", t.stage);
        const meta = t.metadata as any;
        console.log("isStaffingRequest:", meta?.isStaffingRequest);
        console.log("sharepointSynced:", meta?.sharepointSynced);
        console.log("skippedReason:", meta?.skippedReason ?? "(none)");

        const msg = t.messages[0];
        if (msg) {
            const bodyPreview = (msg.bodyText ?? msg.bodyPreview ?? "").slice(0, 300);
            console.log("Body preview:", bodyPreview);
            console.log("Attachments extracted:", msg.attachments.length);
            for (const att of msg.attachments) {
                const ej = att.extractedJson as any;
                if (ej?.sharepoint_mapping) {
                    console.log(`  ${att.filename} → ChildName: ${ej.sharepoint_mapping.ChildName ?? "(null)"}`);
                }
            }
        } else {
            console.log("NO MESSAGES on this thread!");
        }
    }

    await prisma.$disconnect();
}

main();
