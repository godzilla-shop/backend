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

        // 2. Get contacts stats from Firestore
        const snap = await db.collection('contacts').get();
        const contacts = snap.docs.map(d => d.data());
        const totalContacts = contacts.length;
        const sent = contacts.filter(c => c.messageSent).length;
        const pending = contacts.filter(c => !c.messageSent).length;
        const failed = contacts.filter(c => c.error).length;

        // 3. Load config
        const configDoc = await db.collection('system_config').doc('main').get();
        const config = configDoc.exists ? configDoc.data() : { messagesPerDay: 50, delayBetweenMessages: 2 };

        res.status(200).json({
            whatsapp: {
                status: whatsappStatus,
                ...whatsappDetails,
            },
            contacts: {
                total: totalContacts,
                sent,
                pending,
                failed,
                deliveryRate: totalContacts > 0 ? parseFloat(((sent / totalContacts) * 100).toFixed(1)) : 0,
            },
            config,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch system status' });
    }
};
