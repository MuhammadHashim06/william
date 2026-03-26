
import "dotenv/config";
import { sharePointClient } from "../src/lib/sharepoint";

const SITE_HOSTNAME = "therapydepotonline.sharepoint.com";
const SITE_PATH = "/sites/THERAPYDEPOTTEAMSITE";
const DRIVE_NAME = "STAFFING";
const EXCEL_FILE_REL_PATH = "/2026 STAFFING/UNSTAFFED REFERRALS 1.20.26 AI Project.xlsx";
const TABLE_NAME = "UnstaffedRef";

async function main() {
    console.log("Connecting to SharePoint...");
    const client = await sharePointClient();

    console.log(`Fetching site: ${SITE_PATH}...`);
    const site = await client.api(`/sites/${SITE_HOSTNAME}:${SITE_PATH}`).get();

    console.log(`Fetching drive: ${DRIVE_NAME}...`);
    const drives = await client.api(`/sites/${site.id}/drives`).get();
    const drive = drives.value.find((d: any) => d.name === DRIVE_NAME);
    if (!drive) throw new Error(`Drive ${DRIVE_NAME} not found`);

    console.log(`Fetching file: ${EXCEL_FILE_REL_PATH}...`);
    const file = await client.api(`/drives/${drive.id}/root:${EXCEL_FILE_REL_PATH}`).get();

    console.log(`Fetching table: ${TABLE_NAME}...`);
    // Check if table exists
    try {
        const table = await client.api(`/drives/${drive.id}/items/${file.id}/workbook/tables/${TABLE_NAME}`).get();
        console.log(`Table found: ${table.name} (ID: ${table.id})`);

        // Get Columns
        const columns = await client.api(`/drives/${drive.id}/items/${file.id}/workbook/tables/${TABLE_NAME}/columns`).get();
        console.log("\n--- ONLINE COLUMNS ---");
        columns.value.forEach((c: any, i: number) => {
            console.log(`${i}: ${c.name}`);
        });

        // Get Sample Data
        const rows = await client.api(`/drives/${drive.id}/items/${file.id}/workbook/tables/${TABLE_NAME}/rows?$top=1`).get();
        console.log("\n--- ONLINE SAMPLE ROW (Index 0) ---");
        if (rows.value.length > 0) {
            const rowVal = rows.value[0].values[0];
            columns.value.forEach((c: any, i: number) => {
                console.log(`${c.name}: ${rowVal[i]}`);
            });
        }

    } catch (e: any) {
        console.error("Error fetching table or columns:", e.message);
    }
}

main().catch(console.error);
