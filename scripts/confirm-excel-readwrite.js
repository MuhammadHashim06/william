/**
 * confirm-excel-readwrite.js
 * Confirms READ + WRITE access on SharePoint Excel table via Microsoft Graph.
 * - Reads top 1 row
 * - Adds 1 test row (EXACT column count)
 * - Reads top 3 rows to verify
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
    if (!res.ok) throw new Error(`Auth failed (${res.status}): ${data.error_description || JSON.stringify(data)}`);
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
        throw new Error(
            JSON.stringify(
                { status: res.status, statusText: res.statusText, requestId, url, error: data?.error || data, raw: text },
                null,
                2
            )
        );
    }
    return data;
}

async function graphPost(token, url, body) {
    const res = await fetch(`https://graph.microsoft.com/v1.0${url}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
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
        throw new Error(
            JSON.stringify(
                { status: res.status, statusText: res.statusText, requestId, url, error: data?.error || data, raw: text },
                null,
                2
            )
        );
    }
    return data;
}

function buildTestRow(expectedCols) {
    // Table column order (based on your output):
    // 1 UniqueIdentifier, 2 EntryDate, 3 ReferralDate, 4 CustomerName, ...
    // We'll fill only a few meaningful fields, rest blanks.
    const row = new Array(expectedCols).fill("");

    // indices are 0-based:
    row[0] = `RW-TEST-${Date.now()}`; // UniqueIdentifier
    row[3] = "ReadWrite Test";        // CustomerName
    row[8] = "Open";                  // Status

    return row;
}

async function main() {
    console.log("🔐 Getting access token...");
    const token = await getAccessToken();
    console.log("✅ Token OK");

    console.log("🌐 Resolving SharePoint site...");
    const site = await graphGet(token, `/sites/${SITE_HOSTNAME}:${SITE_PATH}`);
    console.log(`✅ Site: ${site.name}`);

    console.log("📁 Getting document libraries...");
    const drives = await graphGet(token, `/sites/${site.id}/drives`);
    const targetDrive = drives.value.find((d) => d.name === DRIVE_NAME);
    if (!targetDrive) throw new Error(`Drive "${DRIVE_NAME}" not found`);
    console.log(`✅ Drive: ${targetDrive.name}`);

    console.log("📄 Locating Excel file...");
    const encodedPath = EXCEL_FILE_PATH.split("/").map(encodeURIComponent).join("/");
    const file = await graphGet(token, `/drives/${targetDrive.id}/root:${encodedPath}`);
    console.log(`✅ File: ${file.name}`);

    console.log("🧱 Fetching table columns...");
    const columnsResp = await graphGet(
        token,
        `/drives/${targetDrive.id}/items/${file.id}/workbook/tables/${TABLE_NAME}/columns`
    );
    const expectedCols = columnsResp.value.length;
    console.log(`✅ Table "${TABLE_NAME}" columns: ${expectedCols}`);

    console.log("📖 READ test (top 1 row)...");
    const topRow = await graphGet(
        token,
        `/drives/${targetDrive.id}/items/${file.id}/workbook/tables/${TABLE_NAME}/rows?$top=1`
    );
    const first = topRow.value?.[0]?.values?.[0];
    console.log("✅ Read OK. First row length:", first?.length);
    console.log("   First row sample:", JSON.stringify(first));

    console.log("✍️ WRITE test (adding 1 row)...");
    const testRow = buildTestRow(expectedCols);
    console.log("   Outgoing row length:", testRow.length);

    await graphPost(
        token,
        `/drives/${targetDrive.id}/items/${file.id}/workbook/tables/${TABLE_NAME}/rows/add`,
        { values: [testRow] }
    );

    console.log("✅ Write OK. Row added.");

    console.log("🔎 VERIFY (read top 3 rows)...");
    const verify = await graphGet(
        token,
        `/drives/${targetDrive.id}/items/${file.id}/workbook/tables/${TABLE_NAME}/rows?$top=3`
    );

    const rows = verify.value.map((r) => r.values?.[0] || []);
    console.log("✅ Verify OK. Top rows UniqueIdentifier values:");
    rows.forEach((r, i) => console.log(`   Row ${i + 1} UniqueIdentifier: ${r[0]}`));

    console.log("\n🎉 CONFIRMED: You have READ + WRITE access on this Excel table.");
}

main().catch((err) => {
    console.error("\n❌ Error:\n", err.message);
});
