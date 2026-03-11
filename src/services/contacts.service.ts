import { db } from '../config/firebase';

export class ContactsService {
    private collection = db.collection('contacts');

    async getAllContacts() {
        const snapshot = await this.collection.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    private sanitizePhone(raw: string): string {
        let clean = String(raw ?? '').replace(/[\s\+\-\(\)]/g, '').trim();

        // SMART ITALY FORMAT: 
        // If it has 10 digits and starts with 3 (like 371 398 5074), 
        // we assume it's an Italian mobile lacking the 39 prefix.
        if (clean.length === 10 && clean.startsWith('3')) {
            clean = '39' + clean;
        }
        return clean;
    }

    async createContact(data: { name: string; phone: string }) {
        const phone = this.sanitizePhone(data.phone);
        if (!phone || phone.length < 6) {
            throw new Error('Invalid phone number');
        }

        const docRef = this.collection.doc(phone);
        const doc = await docRef.get();

        if (doc.exists) {
            return { id: doc.id, ...doc.data(), duplicated: true };
        }

        const newContact = {
            name: data.name.trim(),
            phone: phone,
            createdAt: new Date(),
            updatedAt: new Date(),
            messageSent: false,
            active: true,
            attempts: 0
        };

        await docRef.set(newContact);

        return { id: phone, ...newContact, duplicated: false };
    }

    async updateContact(id: string, data: Partial<{ name: string; phone: string; active: boolean }>) {
        const docRef = this.collection.doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            throw new Error('Contact not found');
        }

        const updateData: any = {
            ...data,
            updatedAt: new Date()
        };

        // Phone is the Document ID in Firestore, it cannot be 'updated'.
        // To change a phone, one must delete and re-create.
        delete updateData.phone;

        await docRef.update(updateData);
        return { id, ...doc.data(), ...updateData };
    }

    async deleteContact(id: string) {
        const docRef = this.collection.doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            throw new Error('Contact not found');
        }

        await docRef.delete();
        return { id, success: true };
    }
}

export const contactsService = new ContactsService();
