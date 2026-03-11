import { Request, Response } from 'express';
import { excelService } from '../services/excel.service';
import { contactsService } from '../services/contacts.service';

export const importExcel = async (req: Request, res: Response) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const data = excelService.parseExcel(req.file.buffer);
        const imported = [];
        const duplicates = [];
        const skipped = [];

        for (const item of data as any[]) {
            const rawPhone = item.phone || item.Telefono || item.Teléfono || item.telefono || '';
            const name = String(item.name || item.Nombre || item.nombre || '').trim();

            if (!rawPhone) {
                skipped.push({ name, phone: '' });
                continue;
            }

            try {
                const result = await contactsService.createContact({ name, phone: String(rawPhone) }) as any;

                if (result.duplicated) {
                    duplicates.push(result);
                } else {
                    imported.push(result);
                }
            } catch (err: any) {
                // If it's an 'Invalid phone number' or similar validation error from the service
                skipped.push({ name, phone: rawPhone, error: err.message });
            }
        }

        res.status(200).json({
            message: 'Import completed',
            summary: {
                newlyImported: imported.length,
                duplicatesFound: duplicates.length,
                invalidRows: skipped.length,
                totalProcessed: data.length
            }
        });
    } catch (error) {
        console.error('Import Error:', error);
        res.status(500).json({ error: 'Failed to import excel data' });
    }
};
