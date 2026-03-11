import { db } from '../config/firebase';

export class ContactsService {
    private collection = db.collection('contacts');

    async getAllContacts(search?: string, page: number = 1, limit: number = 20, onlyHistory: boolean = false, onlyActive: boolean = false) {
        let query: any = this.collection;

        // Apply specialized filters
        if (onlyHistory) {
            // Fetch those already sent or with failed attempts
            // Note: This is a complex query in Firestore if we use OR. 
            // For simplicity, we'll filter by messageSent or attempts.
            query = query.where('messageSent', '==', true);
        }

        if (onlyActive) {
            query = query.where('active', '==', true);
        }

        // Apply search filter if provided
        if (search) {
            const searchLower = search.toLowerCase();
            // Note: Firestore doesn't support complex "contains" or case-insensitive search easily.
            // This is a basic prefix match as a workaround for Firebase limitations.
            query = query.where('name', '>=', search).where('name', '<=', search + '\uf8ff');
        }

        // Get total count (using a separate count query is more efficient)
        const totalSnapshot = await query.count().get();
        const total = totalSnapshot.data().count;

        // Apply pagination
        // IMPORTANT: Offset in Firestore still costs reads for skipped items. 
        // For 6k items it's acceptable, for millions we'd use cursor-based (startAfter).
        const offset = (page - 1) * limit;
        const snapshot = await query.orderBy('name').offset(offset).limit(limit).get();

        const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }

    async bulkUpdateStatus(search: string, active: boolean) {
        if (!search) throw new Error('Search filter is required for bulk update');

        const query = this.collection
            .where('name', '>=', search)
            .where('name', '<=', search + '\uf8ff');

        const snapshot = await query.get();
        if (snapshot.empty) return 0;

        const docs = snapshot.docs;
        let totalUpdated = 0;

        // Firestore batches are limited to 500 operations
        for (let i = 0; i < docs.length; i += 500) {
            const batch = db.batch();
            const chunk = docs.slice(i, i + 500);

            chunk.forEach(doc => {
                batch.update(doc.ref, { active, updatedAt: new Date() });
            });

            await batch.commit();
            totalUpdated += chunk.length;
        }

        return totalUpdated;
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

    async bulkCreateContacts(contacts: { name: string; phone: string }[]) {
        const results = {
            imported: 0,
            duplicates: 0,
            skipped: 0
        };

        // 1. Sanitize and Filter
        const validContacts = contacts.map(c => ({
            name: String(c.name || '').trim(),
            phone: this.sanitizePhone(c.phone)
        })).filter(c => {
            if (!c.phone || c.phone.length < 6) {
                results.skipped++;
                return false;
            }
            return true;
        });

        if (validContacts.length === 0) return results;

        // 2. Process in batches of 500 (Firestore limit)
        for (let i = 0; i < validContacts.length; i += 500) {
            const chunk = validContacts.slice(i, i + 500);
            const batch = db.batch();

            // Bulk read all potential docs in this chunk
            const refs = chunk.map(c => this.collection.doc(c.phone));
            const snapshots = await db.getAll(...refs);

            snapshots.forEach((snap, idx) => {
                const contactData = chunk[idx];
                if (snap.exists) {
                    results.duplicates++;
                } else {
                    const newContact = {
                        name: contactData.name,
                        phone: contactData.phone,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        messageSent: false,
                        active: true,
                        attempts: 0
                    };
                    batch.set(this.collection.doc(contactData.phone), newContact);
                    results.imported++;
                }
            });

            await batch.commit();
        }

        return results;
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
