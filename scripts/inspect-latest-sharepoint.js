
require('dotenv').config();

const TENANT_ID = process.env.SHAREPOINT_TENANT_ID;
const CLIENT_ID = process.env.SHAREPOINT_CLIENT_ID;
const CLIENT_SECRET = process.env.SHAREPOINT_CLIENT_SECRET;

const SITE_HOSTNAME = 'therapydepotonline.sharepoint.com';
const SITE_PATH = '/sites/THERAPYDEPOTTEAMSITE';
const DRIVE_NAME = 'STAFFING';
const EXCEL_FILE_PATH = '/2026 STAFFING/UNSTAFFED REFERRALS 1.20.26 AI Project.xlsx';
const TABLE_NAME = 'UnstaffedRef';

async function getAccessToken() {
    const url = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'client_credentials',
        scope: 'https://graph.microsoft.com/.default',
    });

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(`Auth failed: ${data.error_description}`);
    return data.access_token;
}

async function graphGet(token, url) {
    const res = await fetch(`https://graph.microsoft.com/v1.0${url}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    return data;
}

async function main() {
    try {
        console.log('🔐 Getting access token...');
        const token = await getAccessToken();

        console.log('🌐 Resolving SharePoint site...');
        const site = await graphGet(token, `/sites/${SITE_HOSTNAME}:${SITE_PATH}`);
        console.log(`✅ Site found: ${site.name}`);

        console.log('📁 Getting document libraries...');
        const drives = await graphGet(token, `/sites/${site.id}/drives`);
        const targetDrive = drives.value.find(d => d.name === DRIVE_NAME);

        if (!targetDrive) {
            throw new Error(`Document library "${DRIVE_NAME}" not found`);
        }
        console.log(`✅ Found library: "${targetDrive.name}"`);

        console.log('📄 Locating Excel file...');
        const encodedPath = EXCEL_FILE_PATH.split('/').map(encodeURIComponent).join('/');
        const file = await graphGet(token, `/drives/${targetDrive.id}/root:${encodedPath}`);
        console.log(`✅ File found: ${file.name}`);

        console.log('📊 Verifying Excel table...');
        const tables = await graphGet(token, `/drives/${targetDrive.id}/items/${file.id}/workbook/tables`);
        const table = tables.value.find(t => t.name === TABLE_NAME);
        if (!table) throw new Error(`Table "${TABLE_NAME}" not found`);
        console.log(`✅ Table found: ${TABLE_NAME}`);

        // Get columns to map indices to names
        const columnsResp = await graphGet(token, `/drives/${targetDrive.id}/items/${file.id}/workbook/tables/${TABLE_NAME}/columns`);
        const columns = columnsResp.value.map(c => c.name);

        console.log('📋 Fetching rows...');
        // Fetching all rows to get the latest ones. 
        // Note: For very large sheets, this might need pagination, but likely okay for this use case.
        const rowsResp = await graphGet(token, `/drives/${targetDrive.id}/items/${file.id}/workbook/tables/${TABLE_NAME}/rows`);
        const allRows = rowsResp.value;
        const totalRows = allRows.length;

        console.log(`Total rows in table: ${totalRows}`);

        const INSPECT_COUNT = 50; // Inspect last 50 rows
        const startIdx = Math.max(0, totalRows - INSPECT_COUNT);
        const lastRows = allRows.slice(startIdx);

        console.log(`\n🔎 Inspecting last ${lastRows.length} entries (Rows ${startIdx + 1} to ${totalRows}):\n`);

        let outputContent = `Total rows in table: ${totalRows}\n`;
        outputContent += `Inspecting last ${lastRows.length} entries (Rows ${startIdx + 1} to ${totalRows}):\n\n`;

        lastRows.forEach((row, idx) => {
            const rowIndex = startIdx + idx + 1; // 1-based index relative to table data
            const values = row.values[0];

            // Check for empty/missing values
            const missingCols = [];
            values.forEach((val, colIdx) => {
                if (val === null || val === '' || val === undefined) {
                    missingCols.push(columns[colIdx] || `Col ${colIdx + 1}`);
                }
            });

            outputContent += `Row ${rowIndex}:\n`;
            outputContent += `  Data: ${JSON.stringify(values)}\n`;
            if (missingCols.length > 0) {
                outputContent += `  ❌ MISSING: ${missingCols.join(', ')}\n`;
            } else {
                outputContent += `  ✅ Complete\n`;
            }
            outputContent += '-'.repeat(40) + '\n';
        });

        const fs = require('fs');
        fs.writeFileSync('scripts/inspect_results.txt', outputContent, 'utf8');
        console.log('✅ Inspection results written to scripts/inspect_results.txt');

    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

main();
