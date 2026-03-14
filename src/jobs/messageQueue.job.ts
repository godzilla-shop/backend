import cron from 'node-cron';
import { db } from '../config/firebase';
import { whatsappService } from '../services/whatsapp.service';
import { getSystemConfig } from '../services/systemConfig.service';

// Returns a random delay between min and max milliseconds (human-like)
const randomDelay = (minSec: number, maxSec: number): number => {
    return Math.floor(Math.random() * (maxSec - minSec + 1) + minSec) * 1000;
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Gets the current time in Italy (Europe/Rome)
 */
export const getItalyTime = () => {
    const now = new Date();
    const itStr = now.toLocaleString("en-GB", { timeZone: "Europe/Rome" }); // DD/MM/YYYY, HH:mm:ss
    const [date, time] = itStr.split(", ");
    const [hours, minutes] = time.split(":").map(Number);

    // Format YYYY-MM-DD for consistency
    const [d, m, y] = date.split("/").map(Number);
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    return {
        hours,
        minutes,
        dateStr, // YYYY-MM-DD
        timeStr: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    };
};

/**
 * Main queue processing logic
 * @param force If true, bypasses the daily lock (still respects messagesPerDay limit)
 */
export const runMessageQueue = async (force: boolean = false) => {
    try {
        const config = (await getSystemConfig()) as any;
        const it = getItalyTime();

        console.log(`🚀 [Queue] Starting process for ${it.dateStr}. Force: ${force}`);

        // 1. Check Firestore lock to prevent double execution on the same day (unless forced)
        const lockRef = db.collection('system_config').doc('last_run');
        const lockDoc = await lockRef.get();

        if (!force && lockDoc.exists && lockDoc.data()?.date === it.dateStr) {
            console.log(`⏸️  [Queue] already completed for ${it.dateStr}. Skipping.`);
            return { skipped: true, reason: 'Already run today' };
        }

        // Set the lock
        await lockRef.set({ date: it.dateStr, lastRun: new Date() });

        // 2. Fetch pending contacts
        const dailyLimit = config?.messagesPerDay ?? 250;

        // We could also check how many were already sent today to truly enforce the 'daily' cap
        // but for now, we'll just fetch a batch of 'dailyLimit' pending contacts.
        const pendingSnap = await db.collection('contacts')
            .where('messageSent', '==', false)
            .where('active', '==', true)
            .limit(dailyLimit)
            .get();

        if (pendingSnap.empty) {
            console.log('📭 [Queue] No pending contacts to process.');
            return { skipped: false, count: 0 };
        }

        console.log(`🔥 [Queue] Sending ${pendingSnap.size} messages...`);

        let sentCount = 0;

        for (const doc of pendingSnap.docs) {
            const contact = doc.data();

            try {
                // Use the official template name
                await whatsappService.sendTemplateMessage(
                    contact.phone,
                    'nuovo_numero_godzilla',
                    'it',
                    contact.name
                );

                await doc.ref.update({
                    messageSent: true,
                    updatedAt: new Date(),
                    error: null,
                });

                sentCount++;
                console.log(`✅ [${sentCount}/${pendingSnap.size}] Sent to ${contact.phone}`);

                // Use custom delay from config with a small random jitter (+/- 20%)
                const baseDelay = config?.delayBetweenMessages ?? 60;
                const jitter = Math.floor(baseDelay * 0.2);
                const finalDelay = randomDelay(baseDelay - jitter, baseDelay + jitter);
                
                console.log(`⏱️ [Queue] Waiting ${Math.round(finalDelay / 1000)}s before next message...`);
                await sleep(finalDelay);

                // Every 50 messages → long human-like pause (2–4 minutes)
                if (sentCount % 50 === 0 && sentCount < pendingSnap.size) {
                    const longBreak = randomDelay(120, 240);
                    console.log(`⏸️  [Queue] Long pause after 50 messages: ${Math.round(longBreak / 1000)}s`);
                    await sleep(longBreak);
                }

            } catch (error: any) {
                console.error(`❌ [Queue] Failed to send to ${contact.phone}:`, error?.message);
                await doc.ref.update({
                    attempts: (contact.attempts || 0) + 1,
                    error: error?.message || 'Unknown error',
                    updatedAt: new Date(),
                });
            }
        }

        console.log(`🏁 [Queue] Done. Sent ${sentCount} messages.`);
        return { skipped: false, count: sentCount };

    } catch (error) {
        console.error('💥 [Queue] Critical error:', error);
        throw error;
    }
};

export const initMessageScheduler = () => {
    // Run EVERY MINUTE to check if it's time to start according to config
    cron.schedule('* * * * *', async () => {
        try {
            const config = (await getSystemConfig()) as any;
            const it = getItalyTime();

            // Check if user set a specific startTime (e.g. "09:30")
            const scheduledTime = config.startTime || "09:00";

            // Match the exact minute
            if (it.timeStr === scheduledTime) {
                console.log(`⏰ [Scheduler] Time match! Starting automated run...`);
                await runMessageQueue(false);
            }

        } catch (error) {
            console.error('💥 [Scheduler] Error in cron job:', error);
        }
    });

    console.log('📅 [Scheduler] Daily checker initialized — watching for Italy time matches');
};
