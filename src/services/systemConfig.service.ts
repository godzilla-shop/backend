import { db } from '../config/firebase';

export const getSystemConfig = async () => {
    const doc = await db.collection('system_config').doc('main').get();
    if (!doc.exists) {
        // Default config
        return {
            messagesPerDay: 50,
            delayBetweenMessages: 10,
            retryAttempts: 3,
            pauseOnRateLimit: true,
            whatsappTemplate: 'nuovo_numero_godzilla'
        };
    }
    return doc.data();
};

export const updateSystemConfig = async (data: any) => {
    await db.collection('system_config').doc('main').set(data, { merge: true });
};
