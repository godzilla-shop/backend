import { Router } from 'express';
import multer from 'multer';
import * as importController from '../controllers/import.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', authMiddleware, upload.single('file'), importController.importExcel);

export default router;
