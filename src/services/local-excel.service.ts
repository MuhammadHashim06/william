
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

// Path to the local Excel file
// Note: This matches the path verified in previous steps
const LOCAL_EXCEL_PATH = path.join(process.cwd(), 'src/data/2026 STAFFINGUNSTAFFED REFERRALS 1.20.26 AI Project.xlsx.xlsx');

// The same columns as defined in sharepoint.service.ts
const TABLE_COLUMNS = [
    "UniqueIdentifier",  // 0
    "EntryDate",         // 1
    "ReferralDate",      // 2
    "CustomerName",      // 3
    "CustomerPhone",     // 4
    "CustomerEmail",     // 5
    "CustomerCompany",   // 6
    "ReferralType",      // 7
    "Status",            // 8
    "StaffedName",       // 9
    "StaffedDate",       // 10
    "ChildName",         // 11
    "  Program ID",      // 12
    "ServiceType",       // 13
    "Mandate",           // 14
    "Language",          // 15
    "DateOfBirth",       // 16
    "Notes",             // 17
    "StreetAddress",     // 18
    "City",              // 19
    "NY",                // 20
    "ZipCode",           // 21
    "County",            // 22
    "CaregiverName",     // 23
    "PhoneNumber",       // 24
    "Location",          // 25
    "Column1",           // 26
];

export class LocalExcelService {
    private static async executeWithRetry<T>(operation: () => T, description: string): Promise<T | null> {
        const MAX_RETRIES = 5;
        const RETRY_DELAY = 2000; // 2 seconds

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                return operation();
            } catch (error: any) {
                if (error.code === 'EBUSY' && attempt < MAX_RETRIES) {
                    console.warn(`[LocalExcel] File locked (EBUSY) during ${description}. Retrying in ${RETRY_DELAY}ms... (Attempt ${attempt}/${MAX_RETRIES})`);
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                    continue;
                }
                console.error(`[LocalExcel] Failed to ${description}:`, error);
                return null; // or throw, but existing code returns boolean/void
            }
        }
        return null;
    }

    /**
     * Appends a row to the local Excel file.
     * Creates the file with headers if it doesn't exist.
     */
    static async appendRow(row: string[]) {
        const result = await this.executeWithRetry(() => {
            const dir = path.dirname(LOCAL_EXCEL_PATH);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            let workbook: XLSX.WorkBook;
            let worksheet: XLSX.WorkSheet;

            if (fs.existsSync(LOCAL_EXCEL_PATH)) {
                // Read existing file
                workbook = XLSX.readFile(LOCAL_EXCEL_PATH);
                const sheetName = workbook.SheetNames[0];
                worksheet = workbook.Sheets[sheetName];
            } else {
                // Create new file
                workbook = XLSX.utils.book_new();
                worksheet = XLSX.utils.aoa_to_sheet([TABLE_COLUMNS]);
                XLSX.utils.book_append_sheet(workbook, worksheet, "UnstaffedRef");
            }

            // Append the new row
            // We use origin: -1 to append to the end of the sheet
            XLSX.utils.sheet_add_aoa(worksheet, [row], { origin: -1 });

            // Write back to file
            XLSX.writeFile(workbook, LOCAL_EXCEL_PATH);
            console.log(`[LocalExcel] successfully appended row: ${row[0]}`);
            return true;
        }, "appendRow");

        return result === true;
    }

    /**
     * Updates an existing row in the local Excel file identified by UniqueIdentifier (Col 0).
     * Replaces the entire row with newRowData.
     */
    static async updateRow(uniqueId: string, newRowData: string[]) {
        const result = await this.executeWithRetry(() => {
            if (!fs.existsSync(LOCAL_EXCEL_PATH)) {
                console.warn("[LocalExcel] File not found, cannot update row.");
                return false;
            }

            const workbook = XLSX.readFile(LOCAL_EXCEL_PATH);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Convert to array of arrays to find the index
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];

            // Find row index (assuming UniqueIdentifier is at index 0)
            const rowIndex = rows.findIndex(row => row && row[0] === uniqueId);

            if (rowIndex === -1) {
                console.warn(`[LocalExcel] Row with UniqueIdentifier '${uniqueId}' not found.`);
                return false;
            }

            // Update the row in the worksheet
            // origin: rowIndex means starting at that row (0-indexed including header? check utils)
            // sheet_add_aoa origin: -1 is append. origin: number is row index.
            // If header is row 0, and findIndex includes header, then rowIndex is correct.
            XLSX.utils.sheet_add_aoa(worksheet, [newRowData], { origin: rowIndex });

            XLSX.writeFile(workbook, LOCAL_EXCEL_PATH);
            console.log(`[LocalExcel] successfully updated row: ${uniqueId}`);
            return true;
        }, "updateRow");

        return result === true;
    }
}
