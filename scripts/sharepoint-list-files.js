/**
 * Lists all Document Libraries and their root-level files/folders
 * in the THERAPYDEPOTTEAMSITE SharePoint site.
 * This helps us find the correct path to the Excel file.
 */

require('dotenv').config();

const TENANT_ID = process.env.SHAREPOINT_TENANT_ID;
const CLIENT_ID = process.env.SHAREPOINT_CLIENT_ID;
const CLIENT_SECRET = process.env.SHAREPOINT_CLIENT_SECRET;
const SP_HOSTNAME = process.env.SP_HOSTNAME;
const SP_SITE_PATH = process.env.SP_SITE_PATH;

const BASE = 'https://graph.microsoft.com/v1.0';

async function getToken() {
    const url = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'client_credentials',
        scope: 'https://graph.microsoft.com/.default',
    });
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() });
    const data = await res.json();
    if (!res.ok) throw new Error(`Auth failed: ${data.error_description}`);
    return data.access_token;
}

async function graphGet(token, path) {
    const res = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(`GET ${path} → ${res.status}: ${JSON.stringify(data)}`);
    return data;
}

async function listFolder(token, driveId, folderId, indent = '  ') {
    const children = await graphGet(token, `/drives/${driveId}/items/${folderId}/children`);
    for (const item of children.value) {
        const type = item.folder ? `📁 [${item.folder.childCount} items]` : `📄 ${(item.size / 1024).toFixed(1)} KB`;
        console.log(`${indent}${type}  ${item.name}`);
        // Recurse into folders (max 1 level deep to avoid too much output)
        if (item.folder && indent === '  ') {
            await listFolder(token, driveId, item.id, '    ');
        }
    }
}

async function main() {
    const token = await getToken();
    console.log('✅ Token acquired\n');

    // Resolve site
    const site = await graphGet(token, `/sites/${SP_HOSTNAME}:${SP_SITE_PATH}`);
    console.log(`📌 Site: "${site.displayName}" (${site.webUrl})\n`);

    // List all drives
    const drives = await graphGet(token, `/sites/${site.id}/drives`);
    console.log(`Found ${drives.value.length} Document Library(s):\n`);

    for (const drive of drives.value) {
        console.log(`═══════════════════════════════════════════`);
        console.log(`📂 Library: "${drive.name}" (ID: ${drive.id})`);
        console.log(`   URL: ${drive.webUrl}`);
        console.log(`───────────────────────────────────────────`);
        try {
            await listFolder(token, drive.id, 'root');
        } catch (err) {
            console.log(`   ❌ Error listing: ${err.message}`);
        }
        console.log('');
    }

    console.log('✅ Done listing files.');
}

main().catch(err => console.error('❌', err.message));
