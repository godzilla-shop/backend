import { Router } from 'express';
import * as messagesController from '../controllers/messages.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/send', authMiddleware, messagesController.sendMessage);
router.post('/start-campaign', authMiddleware, messagesController.startCampaignManual);

export default router;
