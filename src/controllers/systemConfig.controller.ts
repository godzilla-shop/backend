import { Request, Response } from 'express';
import { getSystemConfig, updateSystemConfig } from '../services/systemConfig.service';

export const getConfig = async (req: Request, res: Response) => {
    try {
        const config = await getSystemConfig();
        res.status(200).json(config);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch system config' });
    }
};

export const updateConfig = async (req: Request, res: Response) => {
    try {
        await updateSystemConfig(req.body);
        res.status(200).json({ message: 'Config updated' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update system config' });
    }
};
