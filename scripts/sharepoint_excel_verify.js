import "dotenv/config";
import axios from "axios";
import { ConfidentialClientApplication } from "@azure/msal-node";

const GRAPH = "https://graph.microsoft.com/v1.0";

const {
    SHAREPOINT_TENANT_ID,
    SHAREPOINT_CLIENT_ID,
    SHAREPOINT_CLIENT_SECRET,
    SP_HOSTNAME,
    SP_SITE_PATH,
    DOCUMENT_LIBRARY,
    FILE_RELATIVE_PATH,
    TABLE_NAME,
} = process.env;

const msal = new ConfidentialClientApplication({
    auth: {
        clientId: SHAREPOINT_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${SHAREPOINT_TENANT_ID}`,
        clientSecret: SHAREPOINT_CLIENT_SECRET,
    },
});

async function getToken() {
    const res = await msal.acquireTokenByClientCredential({
        scopes: ["https://graph.microsoft.com/.default"],
    });
    return res.accessToken;
}

const api = (token) =>
    axios.create({
        baseURL: GRAPH,
        headers: { Authorization: `Bearer ${token}` },
    });

async function main() {
    const token = await getToken();
    const graph = api(token);

    console.log("\n✅ Token acquired");

    // 0. Sanity Check: Get Root Site
    console.log("🔍 Checking access to Root Site...");
    try {
        const root = await graph.get(`/sites/root`);
        console.log(`✅ Root Site Accessible: ${root.data.name} (${root.data.webUrl})`);
    } catch (err) {
        console.error("❌ Failed to access Root Site.");
        if (err.response) {
            console.error(`Status: ${err.response.status} ${err.response.statusText}`);
            console.error("Data:", JSON.stringify(err.response.data, null, 2));
        } else {
            console.error(err.message);
        }
    }

    // 1. Search for site
    // Extract a keyword from the path, e.g., "/sites/2026STAFFING" -> "2026STAFFING"
    const siteKeyword = SP_SITE_PATH.split("/").pop() || "2026STAFFING";
    console.log(`\n🔍 Searching for sites matching: "${siteKeyword}"...`);

    const sites = await graph.get(`/sites?search=${siteKeyword}`);

    if (!sites.data.value || sites.data.value.length === 0) {
        console.log("❌ No sites found. Trying to list root sites...");
        const rootSites = await graph.get(`/sites?search=*`);
        rootSites.data.value.forEach(s => console.log(`- ${s.name} (${s.webUrl})`));
        return;
    }

    // Try to find an exact match or take the first one
    const site = sites.data.value.find(s => s.webUrl.includes(SP_SITE_PATH)) || sites.data.value[0];

    console.log("\n📌 Found Site:");
    console.log(`Name: ${site.name}`);
    console.log(`ID: ${site.id}`);
    console.log(`URL: ${site.webUrl}`);

    // 2. List document libraries (Drives)
    console.log(`\n📂 Fetching Document Libraries for Site ID: ${site.id}...`);
    const drives = await graph.get(`/sites/${site.id}/drives`);

    // Find the specific drive configured in .env (e.g. "STAFFING")
    const targetDriveName = DOCUMENT_LIBRARY || "Documents";
    const drive = drives.data.value.find(d => d.name === targetDriveName);

    if (!drive) {
        console.log(`❌ Document library "${targetDriveName}" not found.`);
        console.log("Available libraries:");
        drives.data.value.forEach(d => console.log(`- ${d.name}`));
        return;
    }

    console.log(`✅ Found Library: ${drive.name} (ID: ${drive.id})`);

    // 3. Resolve file
    const cleanFilePath = FILE_RELATIVE_PATH.startsWith("/") ? FILE_RELATIVE_PATH : `/${FILE_RELATIVE_PATH}`;
    const encodedPath = cleanFilePath.split("/").map(encodeURIComponent).join("/");

    console.log(`Looking for file: ${cleanFilePath}`);

    try {
        const file = await graph.get(
            `/drives/${drive.id}/root:${encodedPath}`
        );

        console.log("\n📄 Found Excel File:");
        console.log(`Name: ${file.data.name}`);
        console.log(`ID: ${file.data.id}`);
        console.log(`WebUrl: ${file.data.webUrl}`);

        // 4. List worksheets
        const sheets = await graph.get(
            `/drives/${drive.id}/items/${file.data.id}/workbook/worksheets`
        );

        console.log("\n📑 Worksheets:");
        sheets.data.value.forEach(s => console.log(`- ${s.name}`));

        // 5. List tables
        const tables = await graph.get(
            `/drives/${drive.id}/items/${file.data.id}/workbook/tables`
        );

        console.log("\n📊 Tables:");
        tables.data.value.forEach(t => console.log(`- ${t.name} (ID: ${t.id})`));

        const targetTable = tables.data.value.find(t => t.name === TABLE_NAME);

        if (!targetTable) {
            console.log(`\n⚠️ Table "${TABLE_NAME}" not found in this file.`);
            return;
        }

        // 6. Table columns
        const columns = await graph.get(
            `/drives/${drive.id}/items/${file.data.id}/workbook/tables/${targetTable.id}/columns`
        );

        console.log(`\n🧱 Columns in table "${TABLE_NAME}":`);
        columns.data.value.forEach((c, i) => console.log(`${i + 1}. ${c.name}`));

        // 7. Preview Data
        console.log('\n📋 Existing data (first 5 rows):');
        const rows = await graph.get(
            `/drives/${drive.id}/items/${file.data.id}/workbook/tables/${targetTable.id}/rows`
        );
        console.log(`Total rows: ${rows.data.value.length}`);
        rows.data.value.slice(0, 5).forEach((row, i) => {
            console.log(`Row ${i + 1}: ${JSON.stringify(row.values[0])}`);
        });

        console.log("\n✅ Verification completed. Access Confirmed.");

    } catch (fileErr) {
        console.error("\n❌ Could not find file at this path.");
        if (fileErr.response) {
            console.error(`Status: ${fileErr.response.status} ${fileErr.response.statusText}`);
            console.error("Data:", JSON.stringify(fileErr.response.data, null, 2));
        }
        throw fileErr;
    }
}

main().catch(err => {
    console.error("\n❌ Error");
    if (err.response) {
        console.error(`Status: ${err.response.status} ${err.response.statusText}`);
        console.error("Data:", JSON.stringify(err.response.data, null, 2));
    } else {
        console.error(err.message);
    }
});
