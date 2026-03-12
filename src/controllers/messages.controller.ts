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
        // Trigger the queue processing ASYNCHRONOUSLY
        // We don't 'await' it here to prevent timeouts.
        // It runs in the background.
        runMessageQueue(true)
            .then(result => {
                console.log('✅ Background Campaign Finished:', result);
            })
            .catch(err => {
                console.error('❌ Background Campaign Error:', err);
            });

        // Respond immediately to the frontend
        res.status(200).json({
            success: true,
            message: 'Campaign triggered in the background. Check History or Render logs for progress.'
        });
    } catch (error: any) {
        console.error('Manual Campaign Trigger Error:', error);
        res.status(500).json({ error: error.message || 'Failed to trigger campaign' });
    }
};
