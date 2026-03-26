
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(process.cwd(), 'src/Data/2026 STAFFINGUNSTAFFED REFERRALS 1.20.26 AI Project.xlsx.xlsx');
const workbook = xlsx.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

const logFile = 'excel_deep_analysis.txt';
const log = (msg: string) => fs.appendFileSync(logFile, msg + '\r\n');
fs.writeFileSync(logFile, '');

const headers = data[0] as string[];

log(`Sheet: ${sheetName}`);
log(`Total Rows (incl header): ${data.length}`);
log(`Columns: ${headers.length}`);
log('');

// Show first 10 data rows (rows 1-10)
log('=== FIRST 10 DATA ROWS ===');
for (let r = 1; r <= Math.min(10, data.length - 1); r++) {
    const row = data[r];
    log(`\n--- Row ${r} ---`);
    headers.forEach((h, i) => {
        const val = row?.[i];
        if (val !== undefined && val !== null && val !== '') {
            log(`  ${h}: ${val}`);
        }
    });
}

// Analyze unique values for key columns
log('\n\n=== COLUMN VALUE ANALYSIS ===');

const keyColumns = ['ReferralType', 'Status', 'ServiceType', 'Mandate', 'Language', 'County'];

for (const colName of keyColumns) {
    const colIdx = headers.indexOf(colName);
    if (colIdx === -1) continue;

    const values = new Map<string, number>();
    for (let r = 1; r < data.length; r++) {
        const val = String(data[r]?.[colIdx] ?? '').trim();
        if (val && val !== 'undefined') {
            values.set(val, (values.get(val) || 0) + 1);
        }
    }

    log(`\n${colName} (${values.size} unique values):`);
    // Sort by frequency descending
    const sorted = [...values.entries()].sort((a, b) => b[1] - a[1]);
    sorted.slice(0, 15).forEach(([val, count]) => {
        log(`  "${val}": ${count}`);
    });
    if (sorted.length > 15) log(`  ... and ${sorted.length - 15} more`);
}

// Check how many rows have data in each column (fill rate)
log('\n\n=== COLUMN FILL RATE ===');
headers.forEach((h, i) => {
    let filled = 0;
    for (let r = 1; r < data.length; r++) {
        const val = data[r]?.[i];
        if (val !== undefined && val !== null && val !== '') filled++;
    }
    const pct = ((filled / (data.length - 1)) * 100).toFixed(1);
    log(`  ${h}: ${filled}/${data.length - 1} (${pct}%)`);
});

log('\nDone.');
