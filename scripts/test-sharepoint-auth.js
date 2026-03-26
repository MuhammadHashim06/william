/**
 * Test script for SharePoint/Microsoft Graph authentication
 * Uses client credentials flow (app-only authentication)
 * 
 * Usage: node scripts/test-sharepoint-auth.js
 */

require('dotenv').config();

const TENANT_ID = process.env.SHAREPOINT_TENANT_ID;
const CLIENT_ID = process.env.SHAREPOINT_CLIENT_ID;
const CLIENT_SECRET = process.env.SHAREPOINT_CLIENT_SECRET;

async function getAccessToken() {
    const tokenUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;

    const params = new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'client_credentials',
        scope: 'https://graph.microsoft.com/.default',
    });

    console.log('🔐 Requesting access token...');
    console.log(`   Tenant ID: ${TENANT_ID}`);
    console.log(`   Client ID: ${CLIENT_ID}`);
    console.log(`   Client Secret: ${CLIENT_SECRET ? '***' + CLIENT_SECRET.slice(-4) : '(not set)'}`);
    console.log('');

    try {
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ Authentication failed!');
            console.error('');
            console.error('Error:', data.error);
            console.error('Description:', data.error_description);
            console.error('');

            if (data.error === 'invalid_client') {
                console.error('💡 Tip: This usually means the client secret is wrong or expired.');
                console.error('   Make sure you\'re using the Secret VALUE, not the Secret ID.');
                console.error('   Check Azure Portal → App Registrations → Certificates & secrets');
            }

            return null;
        }

        console.log('✅ Authentication successful!');
        console.log('');
        console.log('Token Info:');
        console.log(`   Token Type: ${data.token_type}`);
        console.log(`   Expires In: ${data.expires_in} seconds (~${Math.round(data.expires_in / 60)} minutes)`);
        console.log(`   Access Token: ${data.access_token.substring(0, 50)}...`);
        console.log('');

        return data.access_token;
    } catch (error) {
        console.error('❌ Network error:', error.message);
        return null;
    }
}

async function testGraphApi(accessToken) {
    if (!accessToken) return;

    console.log('📊 Testing Graph API access...');
    console.log('');

    // Test: Get organization info
    try {
        const response = await fetch('https://graph.microsoft.com/v1.0/organization', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        const data = await response.json();

        if (response.ok) {
            const org = data.value[0];
            console.log('✅ Graph API access confirmed!');
            console.log(`   Organization: ${org.displayName}`);
            console.log(`   Tenant ID: ${org.id}`);
        } else {
            console.error('❌ Graph API error:', data.error?.message || data);
        }
    } catch (error) {
        console.error('❌ Network error:', error.message);
    }
}

async function main() {
    console.log('='.repeat(60));
    console.log('  SharePoint / Microsoft Graph Authentication Test');
    console.log('='.repeat(60));
    console.log('');

    // Check if credentials are set
    if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
        console.error('❌ Missing credentials in .env file!');
        console.error('');
        console.error('Required environment variables:');
        console.error(`   SHAREPOINT_TENANT_ID: ${TENANT_ID ? '✅' : '❌ missing'}`);
        console.error(`   SHAREPOINT_CLIENT_ID: ${CLIENT_ID ? '✅' : '❌ missing'}`);
        console.error(`   SHAREPOINT_CLIENT_SECRET: ${CLIENT_SECRET ? '✅' : '❌ missing'}`);
        process.exit(1);
    }

    const token = await getAccessToken();
    await testGraphApi(token);

    console.log('');
    console.log('='.repeat(60));
}

main();
