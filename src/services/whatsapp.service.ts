import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0';

export class WhatsAppService {
    private accessToken: string;
    private phoneNumberId: string;

    constructor() {
        this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
        this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    }

    async sendTemplateMessage(to: string, templateName: string, languageCode: string = 'it', name: string = '') {
        try {
            const url = `${WHATSAPP_API_URL}/${this.phoneNumberId}/messages`;

            const components: any[] = [];
            if (name) {
                components.push({
                    type: 'body',
                    parameters: [
                        {
                            type: 'text',
                            parameter_name: 'nombre', // Matches {{nombre}} in Meta template
                            text: name
                        }
                    ]
                });
            }

            const response = await axios.post(
                url,
                {
                    messaging_product: 'whatsapp',
                    to: to,
                    type: 'template',
                    template: {
                        name: templateName,
                        language: { code: languageCode },
                        components: components.length > 0 ? components : undefined
                    },
                },
                {
                    headers: {
                        Authorization: `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
            return response.data;
        } catch (error: any) {
            console.error('WhatsApp API Error:', error.response?.data || error.message);
            throw new Error('Failed to send WhatsApp template message');
        }
    }
}

export const whatsappService = new WhatsAppService();
