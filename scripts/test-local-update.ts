
import { LocalExcelService } from "../src/services/local-excel.service";

async function main() {
    console.log("🧪 Testing Local Excel Update...");

    // 1. Create a dummy row to append first (so we have something to update)
    const testId = `TEST-UPDATE-${Date.now()}`;
    const row = new Array(27).fill("");
    row[0] = testId;
    row[3] = "Original Name";

    console.log(`📝 Appending row: ${testId}`);
    await LocalExcelService.appendRow(row);

    // 2. Update the row
    console.log(`🔄 Updating row: ${testId}`);
    const newRow = [...row];
    newRow[3] = "Updated Name ✅";

    const success = await LocalExcelService.updateRow(testId, newRow);

    if (success) {
        console.log("✅ Update reported success.");
    } else {
        console.error("❌ Update failed.");
    }
}

main();
