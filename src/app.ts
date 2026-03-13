import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import contactsRoutes from './routes/contacts.routes';
import messagesRoutes from './routes/messages.routes';
import systemConfigRoutes from './routes/systemConfig.routes';
import importRoutes from './routes/import.routes';
import statusRoutes from './routes/status.routes';
import webhookRoutes from './routes/webhook.routes';
import { initMessageScheduler } from './jobs/messageQueue.job';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Scheduler
initMessageScheduler();

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/contacts', contactsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/config', systemConfigRoutes);
app.use('/api/import', importRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/webhook', webhookRoutes);

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

export default app;
