import { Request, Response } from 'express';
import { db } from '../config/firebase';
import dotenv from 'dotenv';

dotenv.config();

export const verifyWebhook = async (req: Request, res: Response) => {
    /**
     * UPDATE: 'hub.verify_token' is the value of the Verify Token you 
     * specified in the Meta App Dashboard when setting up the webhook.
     */
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'godzilla_secret_2026';

    if (mode && token) {
        if (mode === 'subscribe' && token === verifyToken) {
            console.log('✅ WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            console.error('❌ WEBHOOK_VERIFICATION_FAILED');
            res.sendStatus(403);
        }
    }
};

export const receiveMessage = async (req: Request, res: Response) => {
    try {
        const body = req.body;

        console.log('📥 Incoming Webhook:', JSON.stringify(body, null, 2));

        if (body.object) {
            if (
                body.entry &&
                body.entry[0].changes &&
                body.entry[0].changes[0] &&
                body.entry[0].changes[0].value.messages &&
                body.entry[0].changes[0].value.messages[0]
            ) {
                const message = body.entry[0].changes[0].value.messages[0];
                const from = message.from; // Phone number
                
                // --- SMART MESSAGE DETECTION ---
                let msgBody = 'Attachment/Media';

                if (message.text) {
                    msgBody = message.text.body;
                } else if (message.button) {
                    msgBody = message.button.text; // Quick reply buttons
                } else if (message.interactive) {
                    const interactive = message.interactive;
                    msgBody = interactive.button_reply?.title || interactive.list_reply?.title || 'Interactive Reply';
                } else if (message.location) {
                    msgBody = '📍 Posizione inviata';
                } else if (message.reaction) {
                    msgBody = `Reazione: ${message.reaction.emoji}`;
                } else if (message.type === 'image') {
                    msgBody = '📷 Immagine';
                } else if (message.type === 'video') {
                    msgBody = '🎥 Video';
                } else if (message.type === 'audio' || message.type === 'voice') {
                    msgBody = '🎤 Audio';
                }

                const timestamp = new Date();

                // 1. Determine the name: Prioritize our database over WhatsApp profile
                const contactDoc = await db.collection('contacts').doc(from).get();
                const profileName = body.entry[0].changes[0].value.contacts?.[0]?.profile?.name || 'Cliente';
                const displayName = contactDoc.exists ? contactDoc.data()?.name : profileName;

                // 2. Save message to Firestore
                const chatRef = db.collection('chats').doc(from);

                // 3. Update chat metadata
                await chatRef.set({
                    lastMessage: msgBody,
                    updatedAt: timestamp,
                    phone: from,
                    name: displayName,
                }, { merge: true });

                // Add to messages sub-collection
                await chatRef.collection('messages').add({
                    from: from,
                    to: 'business',
                    body: msgBody,
                    timestamp: timestamp,
                    type: 'incoming',
                    messageId: message.id
                });

                console.log(`💬 New message from ${from}: ${msgBody}`);
            } else if (
                body.entry &&
                body.entry[0].changes &&
                body.entry[0].changes[0] &&
                body.entry[0].changes[0].value.statuses &&
                body.entry[0].changes[0].value.statuses[0]
            ) {
                // Handle status updates (delivered, read)
                const statusUpdate = body.entry[0].changes[0].value.statuses[0];
                const recipientId = statusUpdate.recipient_id;
                const status = statusUpdate.status; // delivered, read, sent, failed

                console.log(`📱 Status update for ${recipientId}: ${status}`);

                // We could update the message status in Firestore here
            }

            res.sendStatus(200);
        } else {
            res.sendStatus(404);
        }
    } catch (error) {
        console.error('💥 Error receiving webhook:', error);
        res.sendStatus(500);
    }
};
