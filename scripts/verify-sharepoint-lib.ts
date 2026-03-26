
import { sharePointClient, getSite } from "../src/lib/sharepoint";

async function main() {
    console.log("Testing SharePoint Library Auth...");

    try {
        const client = await sharePointClient();
        console.log("✅ Client initialized successfully");

        // Try to get the specific site mentioned in other scripts
        const hostname = "therapydepotonline.sharepoint.com";
        const sitePath = "/sites/THERAPYDEPOTTEAMSITE";
        console.log(`Getting site: ${hostname}:${sitePath}...`);

        const site = await getSite(hostname, sitePath);
        console.log(`✅ Connected to Site: ${site.name} (${site.webUrl})`);

        // Try to get the specific site mentioned in other scripts if env vars allow
        // We'll just log success if we get this far
        console.log("✅ Token acquisition and API call successful.");

    } catch (error: any) {
        console.error("❌ Error Details:");
        console.error("  Message:", error.message);
        console.error("  Code:", error.code);
        console.error("  Status:", error.statusCode);
        console.error("  Request ID:", error.requestId);
        if (error.body) {
            console.error("  Body:", JSON.stringify(error.body, null, 2));
        }
        process.exit(1);
    }
}

main();
