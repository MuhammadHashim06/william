
import { prisma } from "../src/lib/db";

async function main() {
    // Body snippets from the inspection report to search for
    const snippets = [
        { id: "REF-1771263372979", text: "adding @Bryant to assist" },
        { id: "REF-1771263415595", text: "OT services are needed within 02/22/2026" },
        { id: "REF-1771263531274", text: "Pediatric Therapy Liaison" },
        { id: "REF-1771270722563", text: "Please advise for any of the following therapies" }
    ];

    console.log(`🔍 Tracing ${snippets.length} emails by BODY CONTENT...`);

    for (const item of snippets) {
        console.log(`\n--------------------------------------------------`);
        console.log(`🔎 LOOKING FOR BODY TEXT: "${item.text}" (Ref: ${item.id})`);

        const msg = await prisma.emailMessage.findFirst({
            where: {
                OR: [
                    { bodyPreview: { contains: item.text } },
                    { bodyText: { contains: item.text } },
                    { bodyHtml: { contains: item.text } }
                ]
            },
            include: {
                thread: true,
                attachments: true
            }
        });

        if (!msg) {
            console.log(`❌ Message NOT FOUND for text: "${item.text}"`);
            continue;
        }

        console.log(`✅ FOUND Message ID: ${msg.id}`);
        console.log(`   Thread ID: ${msg.threadId}`);
        console.log(`   Subject: "${msg.subject}"`);
        console.log(`   Received At: ${msg.receivedAt?.toISOString()}`);
        console.log(`   Attachments: ${msg.attachments.length}`);

        // Analyze why extraction might have failed
        if (msg.attachments.length === 0) {
            console.log(`   ⚠️  REASON: No attachments found on this message.`);
        } else {
            msg.attachments.forEach((att, i) => {
                console.log(`      [Att #${i + 1}] ${att.filename} (${att.status})`);
                console.log(`         Mime: ${att.mimeType} | Size: ${att.sizeBytes}`);
                if (att.status === 'EXTRACTED') {
                    console.log(`         Extracted JSON: ${JSON.stringify(att.extractedJson)}`);
                    if (!att.extractedJson || Object.keys(att.extractedJson as object).length === 0) {
                        console.log(`         ⚠️  Extracted JSON is empty/null.`);
                    }
                } else if (att.status === 'FAILED') {
                    console.log(`         ❌ Error: ${att.lastError}`);
                }
            });
        }
    }
}

main().catch(err => {
    console.error('Fatal Error:', err);
});
