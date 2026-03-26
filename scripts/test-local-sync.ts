
import { LocalExcelService } from '../src/services/local-excel.service';
import * as path from 'path';
import * as fs from 'fs';
import * as XLSX from 'xlsx';

async function main() {
    const testId = `TEST-${Date.now()}`;
    const testRow = [
        testId,                 // 0 UniqueIdentifier
        "2026-02-18",           // 1 EntryDate
        "2026-02-18",           // 2 ReferralDate
        "Test Customer",        // 3 CustomerName
        "555-0123",             // 4 CustomerPhone
        "test@example.com",     // 5 CustomerEmail
        "Test Company",         // 6 CustomerCompany
        "TDP",                  // 7 ReferralType
        "Open",                 // 8 Status
        "",                     // 9 StaffedName
        "",                     // 10 StaffedDate
        "Test Child",           // 11 ChildName
        "PROG-123",             // 12 Program ID
        "OT",                   // 13 ServiceType
        "2*30",                 // 14 Mandate
        "English",              // 15 Language
        "2020-01-01",           // 16 DateOfBirth
        "Test Note Body",       // 17 Notes
        "123 Test St",          // 18 StreetAddress
        "Test City",            // 19 City
        "NY",                   // 20 NY
        "10001",                // 21 ZipCode
        "Test County",          // 22 County
        "Test Parent",          // 23 CaregiverName
        "555-9876",             // 24 PhoneNumber
        "Test Location",        // 25 Location
        "",                     // 26 Column1
    ];

    console.log(`🧪 Testing LocalExcelService with ID: ${testId}`);

    // 1. Append Row
    const success = LocalExcelService.appendRow(testRow);
    if (!success) {
        console.error('❌ LocalExcelService.appendRow returned false');
        process.exit(1);
    }
    console.log('✅ appendRow executed successfully');

    // 2. Verify File Content
    const FILE_PATH = path.join(process.cwd(), 'src/data/2026 STAFFINGUNSTAFFED REFERRALS 1.20.26 AI Project.xlsx.xlsx');

    if (!fs.existsSync(FILE_PATH)) {
        console.error('❌ Excel file not found after write!');
        process.exit(1);
    }

    const workbook = XLSX.readFile(FILE_PATH);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];

    const lastRow = rows[rows.length - 1];
    console.log('📋 Last Row in File:', JSON.stringify(lastRow));

    if (lastRow[0] === testId) {
        console.log('✅ Verification SUCCESS: Test row found in file.');
    } else {
        console.error('❌ Verification FAILED: Last row does not match test data.');
        process.exit(1);
    }
}

main().catch(console.error);
