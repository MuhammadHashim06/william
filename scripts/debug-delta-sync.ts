/**
 * Debug script for Graph API Delta Sync
 * 
 * Checks:
 * 1. DB connection
 * 2. All inboxes and their cursor status
 * 3. Graph API auth
 * 4. Delta sync for each inbox (with error handling)
 * 5. Option to reset stale cursors
 * 
 * Usage:
 *   npx tsx scripts/debug-delta-sync.ts          # Check status only
 *   npx tsx scripts/debug-delta-sync.ts --reset   # Reset stale cursors and retry
 */

import "dotenv/config";
import { prisma } from "@/lib/db";

// Inline graph helpers to avoid import side-effects
import { Client } from "@microsoft/microsoft-graph-client";
import { ClientSecretCredential } from "@azure/identity";

const RESET_MODE = process.argv.includes("--reset");

// ─── Helpers ───────────────────────────────────────────────

function maskUrl(url: string) {
    return url.replace(/:[^:@]*@/, ":****@");
}

async function getGraphClient() {
    const tenantId = process.env.GRAPH_TENANT_ID;
    const clientId = process.env.GRAPH_CLIENT_ID;
    const clientSecret = process.env.GRAPH_CLIENT_SECRET;

    if (!tenantId || !clientId || !clientSecret) {
        throw new Error("Missing GRAPH_TENANT_ID, GRAPH_CLIENT_ID, or GRAPH_CLIENT_SECRET");
    }

    const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
    const token = await credential.getToken("https://graph.microsoft.com/.default");

    return Client.init({
        authProvider: (done) => done(null, token.token),
    });
}

// ─── Main ──────────────────────────────────────────────────

async function main() {
    console.log("╔══════════════════════════════════════════╗");
    console.log("║   Delta Sync Debug Script                ║");
    console.log("╚══════════════════════════════════════════╝");
    console.log(`Mode: ${RESET_MODE ? "🔄 RESET + RETRY" : "🔍 CHECK ONLY"}\n`);

    // ── Step 1: DB Connection ──
    console.log("━━━ Step 1: Database Connection ━━━");
    try {
        const dbUrl = process.env.DATABASE_URL;
        console.log("  DATABASE_URL:", dbUrl ? maskUrl(dbUrl) : "❌ NOT SET");
        const count = await prisma.inbox.count();
        console.log(`  ✅ DB connected — ${count} inbox(es) found\n`);
    } catch (e: any) {
        console.error("  ❌ DB connection failed:", e.message);
        process.exit(1);
    }

    // ── Step 2: Inbox + Cursor Status ──
    console.log("━━━ Step 2: Inbox & Cursor Status ━━━");
    const inboxes = await prisma.inbox.findMany({
        include: { cursor: true },
        where: { isEscalation: false },
    });

    for (const inbox of inboxes) {
        const cursor = inbox.cursor;
        const hasDelta = !!cursor?.deltaLink;
        const deltaPreview = cursor?.deltaLink
            ? cursor.deltaLink.substring(0, 80) + "..."
            : "(none)";

        console.log(`  📧 ${inbox.emailAddress}`);
        console.log(`     ID:         ${inbox.id}`);
        console.log(`     Has cursor: ${cursor ? "✅ Yes" : "❌ No"}`);
        console.log(`     Delta link: ${hasDelta ? "✅ Present" : "⚠️  NULL (will do full sync)"}`);
        console.log(`     Last sync:  ${cursor?.lastSyncAt?.toISOString() ?? "never"}`);
        if (hasDelta) {
            console.log(`     Token:      ${deltaPreview}`);
        }
        console.log();
    }

    // ── Step 3: Graph API Auth ──
    console.log("━━━ Step 3: Graph API Authentication ━━━");
    let graphClient: Client;
    try {
        console.log("  GRAPH_TENANT_ID:", process.env.GRAPH_TENANT_ID ? "✅ Set" : "❌ Missing");
        console.log("  GRAPH_CLIENT_ID:", process.env.GRAPH_CLIENT_ID ? "✅ Set" : "❌ Missing");
        console.log("  GRAPH_CLIENT_SECRET:", process.env.GRAPH_CLIENT_SECRET ? "✅ Set" : "❌ Missing");
        graphClient = await getGraphClient();
        console.log("  ✅ Graph authentication successful\n");
    } catch (e: any) {
        console.error("  ❌ Graph auth failed:", e.message);
        process.exit(1);
    }

    // ── Step 4: Test Delta Sync Per Inbox ──
    console.log("━━━ Step 4: Delta Sync Test ━━━");
    for (const inbox of inboxes) {
        const cursor = inbox.cursor;
        console.log(`\n  📧 Testing: ${inbox.emailAddress}`);

        // Test with existing delta token first
        if (cursor?.deltaLink) {
            console.log("  → Trying existing delta token...");
            try {
                const res = await graphClient!.api(cursor.deltaLink).get();
                const count = res.value?.length ?? 0;
                const hasNext = !!res["@odata.nextLink"];
                const hasDelta = !!res["@odata.deltaLink"];
                console.log(`  ✅ Delta token WORKS — ${count} items, nextLink: ${hasNext}, deltaLink: ${hasDelta}`);
                continue; // This inbox is fine
            } catch (e: any) {
                const msg = e.message || e.body?.message || JSON.stringify(e);
                console.log(`  ❌ Delta token FAILED: ${msg}`);

                if (RESET_MODE) {
                    console.log("  🔄 Resetting cursor...");
                    await prisma.inboxCursor.update({
                        where: { id: cursor.id },
                        data: { deltaLink: null },
                    });
                    console.log("  ✅ Cursor reset to NULL");
                } else {
                    console.log("  💡 Run with --reset to clear this stale token");
                }
            }
        }

        // Test fresh delta (no token)
        console.log("  → Testing fresh delta sync (no token)...");
        try {
            const url = `/users/${encodeURIComponent(inbox.emailAddress)}/mailFolders/Inbox/messages/delta?$select=id,subject,conversationId,receivedDateTime&$top=5`;
            const res = await graphClient!.api(url).get();
            const count = res.value?.length ?? 0;
            const hasNext = !!res["@odata.nextLink"];
            const hasDelta = !!res["@odata.deltaLink"];
            console.log(`  ✅ Fresh delta WORKS — ${count} items (showing first 5), nextLink: ${hasNext}, deltaLink: ${hasDelta}`);

            // Show a preview of items
            if (count > 0) {
                console.log("  📋 Sample messages:");
                for (const item of (res.value ?? []).slice(0, 3)) {
                    console.log(`     - [${item.receivedDateTime}] ${item.subject ?? "(no subject)"}`);
                }
            }
        } catch (e: any) {
            const msg = e.message || e.body?.message || JSON.stringify(e);
            console.error(`  ❌ Fresh delta also FAILED: ${msg}`);
            console.error("  ⚠️  This means Graph API permissions or inbox config is wrong!");
        }
    }

    // ── Summary ──
    console.log("\n━━━ Summary ━━━");
    const staleCount = inboxes.filter(i => i.cursor?.deltaLink).length;
    const nullCount = inboxes.filter(i => !i.cursor?.deltaLink).length;

    if (RESET_MODE) {
        console.log("  🔄 Stale tokens have been reset. Run worker:ingest to start fresh sync.");
    } else {
        console.log(`  Total inboxes: ${inboxes.length}`);
        console.log(`  With delta token: ${staleCount}`);
        console.log(`  Without (fresh sync): ${nullCount}`);
        if (staleCount > 0) {
            console.log(`\n  💡 If delta tokens are stale, run:`);
            console.log(`     npx tsx scripts/debug-delta-sync.ts --reset`);
        }
    }

    await prisma.$disconnect();
    process.exit(0);
}

main().catch((e) => {
    console.error("\n💥 Unexpected error:", e);
    process.exit(1);
});
