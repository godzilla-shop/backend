import { Router } from 'express';
import * as configController from '../controllers/systemConfig.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, configController.getConfig);
router.put('/', authMiddleware, configController.updateConfig);

export default router;
