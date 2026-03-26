/**
 * SharePoint Diagnostics — Step-by-step isolation
 * Tests: token → permissions → site discovery → file discovery
 */

require('dotenv').config();

const TENANT_ID = process.env.SHAREPOINT_TENANT_ID;
const CLIENT_ID = process.env.SHAREPOINT_CLIENT_ID;
const CLIENT_SECRET = process.env.SHAREPOINT_CLIENT_SECRET;
const SP_HOSTNAME = process.env.SP_HOSTNAME;   // therapydepotonline.sharepoint.com
const SP_SITE_PATH = process.env.SP_SITE_PATH; // /sites/2026STAFFING

const BASE = 'https://graph.microsoft.com/v1.0';

async function getToken() {
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
    if (!res.ok) throw new Error(`Auth failed: ${data.error} — ${data.error_description}`);
    return data.access_token;
}

/** Safe GET — returns { ok, status, data } instead of throwing */
async function safeGet(token, path) {
    const res = await fetch(`${BASE}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
}

function hr() { console.log('-'.repeat(60)); }

async function main() {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║   SharePoint Diagnostics                      ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    // ── Step 0: Credentials check ─────────────────────────────
    console.log('📋 Credentials:');
    console.log(`   TENANT_ID:     ${TENANT_ID || '❌ MISSING'}`);
    console.log(`   CLIENT_ID:     ${CLIENT_ID || '❌ MISSING'}`);
    console.log(`   CLIENT_SECRET: ${CLIENT_SECRET ? '***' + CLIENT_SECRET.slice(-4) : '❌ MISSING'}`);
    console.log(`   SP_HOSTNAME:   ${SP_HOSTNAME || '❌ MISSING'}`);
    console.log(`   SP_SITE_PATH:  ${SP_SITE_PATH || '❌ MISSING'}`);
    hr();

    // ── Step 1: Token ─────────────────────────────────────────
    console.log('\n🔐 Step 1: Acquiring token...');
    let token;
    try {
        token = await getToken();
        console.log('   ✅ Token acquired successfully');
    } catch (e) {
        console.error('   ❌ Token FAILED:', e.message);
        return;
    }
    hr();

    // ── Step 2: Basic Graph permission check ──────────────────
    console.log('\n🔑 Step 2: Testing Graph API permissions...');

    // 2a — Organization (needs Organization.Read.All — optional)
    const org = await safeGet(token, '/organization');
    if (org.ok) {
        console.log(`   ✅ /organization → ${org.data.value?.[0]?.displayName}`);
    } else {
        console.log(`   ⚠️  /organization → ${org.status} (OK — this permission may not be granted)`);
    }

    // 2b — Root site (needs Sites.Read.All or Sites.ReadWrite.All)
    const root = await safeGet(token, '/sites/root');
    if (root.ok) {
        console.log(`   ✅ /sites/root → ${root.data.displayName} (${root.data.webUrl})`);
    } else {
        console.log(`   ❌ /sites/root → ${root.status}`);
        console.log('      Data:', JSON.stringify(root.data, null, 2));
        console.log('\n   ⛔ You do NOT have Sites.Read.All (Application) permission granted.');
        console.log('   👉 Go to Azure Portal → App Registrations → API permissions');
        console.log('      1. Add "Microsoft Graph → Application → Sites.Read.All"');
        console.log('      2. Click "Grant admin consent"');
        console.log('      Without this, NO SharePoint calls will work.\n');
        // Don't return — continue to show more info
    }
    hr();

    // ── Step 3: Site discovery ────────────────────────────────
    console.log('\n🌐 Step 3: Discovering SharePoint sites...');

    // 3a — Try direct path resolution
    const directPath = `/sites/${SP_HOSTNAME}:${SP_SITE_PATH}`;
    console.log(`   Trying direct path: GET ${directPath}`);
    const direct = await safeGet(token, directPath);

    if (direct.ok) {
        console.log(`   ✅ Site found: "${direct.data.displayName}" (ID: ${direct.data.id})`);
    } else {
        console.log(`   ❌ Direct path failed (${direct.status}): ${direct.data?.error?.code}`);

        // 3b — Also try the THERAPYDEPOTTEAMSITE path from V2 script
        const altPath = `/sites/${SP_HOSTNAME}:/sites/THERAPYDEPOTTEAMSITE`;
        console.log(`\n   Trying alternate path: GET ${altPath}`);
        const alt = await safeGet(token, altPath);
        if (alt.ok) {
            console.log(`   ✅ Alternate site found: "${alt.data.displayName}" (ID: ${alt.data.id})`);
        } else {
            console.log(`   ❌ Alternate path also failed (${alt.status}): ${alt.data?.error?.code}`);
        }

        // 3c — Search for sites (needs Sites.Read.All)
        console.log('\n   🔍 Searching for all sites...');
        const search = await safeGet(token, '/sites?search=*');
        if (search.ok && search.data.value?.length > 0) {
            console.log(`   Found ${search.data.value.length} site(s):`);
            search.data.value.forEach(s => {
                console.log(`     • "${s.displayName}" — ${s.webUrl}`);
                console.log(`       ID: ${s.id}`);
            });
            console.log('\n   👉 Use the webUrl above to determine the correct SP_SITE_PATH in your .env');
        } else if (search.ok) {
            console.log('   ⚠️  Search returned 0 sites. The app may lack Sites.Read.All.');
        } else {
            console.log(`   ❌ Site search failed (${search.status}): ${search.data?.error?.code}`);
            console.log('      This confirms the app lacks Sites.Read.All permission.');
        }
    }
    hr();

    // ── Step 4: If direct path worked, continue to drives/files ──
    if (direct.ok) {
        const siteId = direct.data.id;

        console.log('\n📁 Step 4: Listing document libraries...');
        const drives = await safeGet(token, `/sites/${siteId}/drives`);
        if (drives.ok) {
            drives.data.value.forEach(d => {
                console.log(`   • "${d.name}" — ID: ${d.id}`);
            });
        } else {
            console.log(`   ❌ Drives failed (${drives.status})`);
        }
    }

    hr();
    console.log('\n✅ Diagnostics complete.\n');
}

main().catch(err => {
    console.error('💥 Unexpected error:', err.message);
});
