import { Request, Response } from 'express';
import { whatsappService } from '../services/whatsapp.service';
import { runMessageQueue } from '../jobs/messageQueue.job';
import { authMiddleware } from '../middleware/auth.middleware';

export const sendMessage = async (req: Request, res: Response) => {
    const { to, message } = req.body;

    if (!to || !message) {
        return res.status(400).json({ error: 'Phone number and message are required' });
    }

    try {
        const result = await whatsappService.sendTemplateMessage(to, 'nuovo_numero_godzilla', 'it', 'Cliente');
        res.status(200).json({ success: true, result });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const startCampaignManual = async (req: Request, res: Response) => {
    try {
        // Trigger the queue processing with force=true to bypass the daily lock
        // but it still follows the limit in the database.
        const result = await runMessageQueue(true);
        res.status(200).json({
            success: true,
            message: 'Campaign started manually',
            details: result
        });
    } catch (error: any) {
        console.error('Manual Campaign Error:', error);
        res.status(500).json({ error: error.message || 'Failed to start campaign' });
    }
};
