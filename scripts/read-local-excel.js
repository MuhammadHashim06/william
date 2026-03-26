
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const FILE_PATH = path.join(__dirname, '../src/data/2026 STAFFINGUNSTAFFED REFERRALS 1.20.26 AI Project.xlsx.xlsx');

if (!fs.existsSync(FILE_PATH)) {
    console.error(`❌ File not found at: ${FILE_PATH}`);
    process.exit(1);
}

console.log(`✅ File found at: ${FILE_PATH}`);

try {
    const workbook = XLSX.readFile(FILE_PATH);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    console.log(`📊 Reading Sheet: ${sheetName}`);

    // Read top 5 rows
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    console.log(`📋 Total Rows: ${rows.length}`);
    console.log(`🔎 First 5 Rows:`);

    rows.slice(0, 5).forEach((row, i) => {
        console.log(`Row ${i + 1}: ${JSON.stringify(row)}`);
    });

} catch (err) {
    console.error('❌ Error reading Excel file:', err.message);
}
