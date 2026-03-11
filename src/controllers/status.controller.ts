import { Request, Response } from 'express';
import axios from 'axios';
import { db } from '../config/firebase';

export const getSystemStatus = async (req: Request, res: Response) => {
    try {
        const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

        // 1. Verify WhatsApp connection by querying the phone number details
        let whatsappStatus = 'inactive';
        let whatsappDetails: any = {};
        try {
            const waRes = await axios.get(
                `https://graph.facebook.com/v19.0/${phoneNumberId}`,
                { params: { access_token: accessToken, fields: 'display_phone_number,verified_name,quality_rating,code_verification_status' } }
            );
            whatsappStatus = 'active';
            whatsappDetails = {
                phoneNumber: waRes.data.display_phone_number,
                name: waRes.data.verified_name,
                quality: waRes.data.quality_rating,
                verified: waRes.data.code_verification_status,
            };
        } catch (err: any) {
            whatsappStatus = 'error';
            whatsappDetails.error = err?.response?.data?.error?.message || 'Cannot reach WhatsApp API';
        }

        // 2. Get contacts stats from Firestore using efficient aggregations
        const contactsColl = db.collection('contacts');

        const [totalCount, sentCount, pendingCount, failedCount] = await Promise.all([
            contactsColl.count().get(),
            contactsColl.where('messageSent', '==', true).count().get(),
            contactsColl.where('messageSent', '==', false).count().get(),
            contactsColl.where('error', '!=', null).count().get(),
        ]);

        const total = totalCount.data().count;
        const sent = sentCount.data().count;
        const pending = pendingCount.data().count;
        const failed = failedCount.data().count;

        // 3. For the chart, we still need some data but we can limit it or use a better query
        // For now, let's get the counts per day of the week by querying only the 'sent' ones
        // but limiting the fields to just 'updatedAt' (or createdAt).
        // A more professional way would be a separate 'daily_stats' collection, but for 6k it's manageable.
        const sentSnap = await contactsColl.where('messageSent', '==', true).select('updatedAt', 'createdAt').get();
        const chartData = Array(7).fill(0);
        sentSnap.docs.forEach(doc => {
            const data = doc.data();
            const date = data.updatedAt || data.createdAt;
            if (date) {
                const ms = date._seconds ? date._seconds * 1000 : new Date(date).getTime();
                const day = new Date(ms).getDay();
                chartData[day]++;
            }
        });

        // 4. Load config
        const configDoc = await db.collection('system_config').doc('main').get();
        const config = configDoc.exists ? configDoc.data() : { messagesPerDay: 50, delayBetweenMessages: 2 };

        res.status(200).json({
            whatsapp: {
                status: whatsappStatus,
                ...whatsappDetails,
            },
            contacts: {
                total,
                sent,
                pending,
                failed,
                deliveryRate: total > 0 ? parseFloat(((sent / total) * 100).toFixed(1)) : 0,
            },
            chart: chartData,
            config,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch system status' });
    }
};
