import cron from 'node-cron';
import { prisma } from '../config/prisma.js';

export const runOverdueAndExpiryChecks = async () => {
  try {
    const now = new Date();
    console.log(`[Estate Cron] Running daily check at ${now.toISOString()}...`);

    // 1. Expiring contracts alert check (<45 days)
    const activeContracts = await prisma.contract.findMany({
      where: { status: 'ACTIVE' },
      include: {
        tenant: true,
        office: { include: { building: true } },
      },
    });

    let expiringCount = 0;
    activeContracts.forEach((c) => {
      const daysLeft = (new Date(c.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      if (daysLeft >= 0 && daysLeft < 45) {
        expiringCount++;
      }
    });

    console.log(`[Estate Cron] Found ${expiringCount} contract(s) expiring within 45 days.`);
  } catch (error) {
    console.error('[Estate Cron] Error during scheduled check:', error.message);
  }
};

export const startCronJobs = () => {
  // Run every day at 00:05 AM
  cron.schedule('5 0 * * *', () => {
    runOverdueAndExpiryChecks();
  });
  console.log('[Estate Cron] Daily estate cron job scheduled.');
};

