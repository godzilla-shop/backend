import { Router } from 'express';
import { getSystemStatus } from '../controllers/status.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, getSystemStatus);

export default router;
