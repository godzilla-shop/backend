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

        // 3. For the chart: Get activity of the LAST 7 DAYS in chronological order
        const chartData: { name: string, count: number }[] = [];
        const daysToFetch = 7;
        const itDays = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
        const esDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const isIt = (req.query.lang || 'it') === 'it';
        const labels = isIt ? itDays : esDays;

        // Create an array for the last 7 days
        for (let i = daysToFetch - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            chartData.push({
                name: labels[d.getDay()],
                count: 0,
                // store normalized date key YYYY-MM-DD for matching
                dateKey: d.toISOString().split('T')[0]
            } as any);
        }

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const recentSentSnap = await contactsColl
            .where('messageSent', '==', true)
            .where('updatedAt', '>=', sevenDaysAgo)
            .select('updatedAt')
            .get();

        recentSentSnap.docs.forEach(doc => {
            const date = doc.data().updatedAt;
            if (date) {
                const ms = date._seconds ? date._seconds * 1000 : new Date(date).getTime();
                const dateKey = new Date(ms).toISOString().split('T')[0];
                const dayEntry = chartData.find((d: any) => d.dateKey === dateKey);
                if (dayEntry) {
                    dayEntry.count++;
                }
            }
        });

        // Remove dateKey before sending to frontend
        const finalChart = chartData.map((d: any) => ({ name: d.name, envios: d.count }));

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
            chart: finalChart,
            config,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch system status' });
    }
};
