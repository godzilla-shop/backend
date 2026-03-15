import { db } from './src/config/firebase';

async function checkStats() {
    try {
        const contactsColl = db.collection('contacts');
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        console.log('Checking messages sent since:', startOfToday.toISOString());
        
        const snap = await contactsColl
            .where('messageSent', '==', true)
            .where('updatedAt', '>=', startOfToday)
            .get();
            
        console.log('Messages sent today:', snap.size);
        
        if (snap.size > 0) {
            console.log('Example updatedAt:', snap.docs[0].data().updatedAt);
        }
        
    } catch (error) {
        console.error('Error checking stats:', error);
    }
}

checkStats();
