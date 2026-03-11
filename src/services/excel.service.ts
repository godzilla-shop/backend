import * as XLSX from 'xlsx';

export class ExcelService {
    parseExcel(buffer: Buffer) {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const datasheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(datasheet);

        // Simple validation could be added here
        return data;
    }
}

export const excelService = new ExcelService();
