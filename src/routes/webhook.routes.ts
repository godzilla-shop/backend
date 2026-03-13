import { Router } from 'express';
import * as webhookController from '../controllers/webhook.controller';

const router = Router();

// Endpoint for Meta to verify the webhook
router.get('/', webhookController.verifyWebhook);

// Endpoint for Meta to send messages and status updates
router.post('/', webhookController.receiveMessage);

export default router;
