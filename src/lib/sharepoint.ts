import "dotenv/config";
import { Client } from "@microsoft/microsoft-graph-client";
import { ClientSecretCredential } from "@azure/identity";

function required(name: string) {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env: ${name}`);
    return v;
}

// Separate credentials for SharePoint operations
const tenantId = required("SHAREPOINT_TENANT_ID");
const clientId = required("SHAREPOINT_CLIENT_ID");
const clientSecret = required("SHAREPOINT_CLIENT_SECRET");

// This credential automatically handles token caching and refreshing
const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);

async function getAccessToken(): Promise<string> {
    const scope = "https://graph.microsoft.com/.default";
    const token = await credential.getToken(scope);
    if (!token?.token) throw new Error("Failed to acquire SharePoint Graph access token");
    return token.token;
}

/**
 * Returns an authenticated Microsoft Graph client specifically for SharePoint operations.
 * Uses the SHAREPOINT_ environment variables.
 */
export async function sharePointClient() {
    const token = await getAccessToken();
    return Client.init({
        authProvider: (done) => done(null, token),
    });
}

/**
 * Helper to get a site by its hostname and path/name.
 * Example: getSite("contoso.sharepoint.com", "/sites/MySite")
 */
export async function getSite(hostname: string, sitePath: string) {
    const client = await sharePointClient();
    return client.api(`/sites/${hostname}:${sitePath}`).get();
}

/**
 * Helper to get drives (document libraries) for a site.
 */
export async function getSiteDrives(siteId: string) {
    const client = await sharePointClient();
    return client.api(`/sites/${siteId}/drives`).get();
}
