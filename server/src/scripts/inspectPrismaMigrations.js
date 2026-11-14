import { prisma } from '../config/prisma.js';

async function check() {
  try {
    const migrations = await prisma.$queryRawUnsafe('SELECT * FROM _prisma_migrations');
    console.log('Recorded migrations in DB:', migrations);
  } catch (err) {
    console.log('Error querying _prisma_migrations:', err.message);
  }

  // Check table list in rent_management_db
  const tables = await prisma.$queryRawUnsafe('SHOW TABLES FROM rent_management_db');
  console.log('Tables in rent_management_db:', tables);

  await prisma.$disconnect();
}

check();
