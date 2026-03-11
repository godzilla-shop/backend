import { Request, Response } from 'express';
import { excelService } from '../services/excel.service';
import { contactsService } from '../services/contacts.service';

export const importExcel = async (req: Request, res: Response) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const data = excelService.parseExcel(req.file.buffer);

        // Prepare contacts for bulk service
        const rawContacts = (data as any[]).map(item => ({
            name: String(item.name || item.Nombre || item.nombre || '').trim(),
            phone: String(item.phone || item.Telefono || item.Teléfono || item.telefono || '')
        }));

        const results = await contactsService.bulkCreateContacts(rawContacts);

        res.status(200).json({
            message: 'Import completed',
            summary: {
                newlyImported: results.imported,
                duplicatesFound: results.duplicates,
                invalidRows: results.skipped,
                totalProcessed: data.length
            }
        });
    } catch (error) {
        console.error('Import Error:', error);
        res.status(500).json({ error: 'Failed to import excel data' });
    }
};
