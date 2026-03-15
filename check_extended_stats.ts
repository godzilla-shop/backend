import { db } from './src/config/firebase';

async function checkStatsExtended() {
    try {
        const contactsColl = db.collection('contacts');
        const now = new Date();
        
        // Yesterday (Saturday)
        const startOfSaturday = new Date(2026, 2, 14); // March 14, 2026
        const endOfSaturday = new Date(2026, 2, 15);
        
        console.log('Checking Saturday (March 14)...');
        const snapSat = await contactsColl
            .where('messageSent', '==', true)
            .where('updatedAt', '>=', startOfSaturday)
            .where('updatedAt', '<', endOfSaturday)
            .get();
        console.log('Messages sent Saturday:', snapSat.size);

        // Today (Sunday)
        console.log('Checking Sunday (March 15)...');
        const snapSun = await contactsColl
            .where('messageSent', '==', true)
            .where('updatedAt', '>=', endOfSaturday)
            .get();
        console.log('Messages sent Sunday:', snapSun.size);

        // Total
        const snapTotal = await contactsColl
            .where('messageSent', '==', true)
            .count().get();
        console.log('Total messages ever sent:', snapTotal.data().count);
        
    } catch (error) {
        console.error('Error checking stats:', error);
    }
}

checkStatsExtended();
