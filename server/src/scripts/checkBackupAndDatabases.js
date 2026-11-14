import { prisma } from '../config/prisma.js';

async function check() {
  try {
    const dbs = await prisma.$queryRawUnsafe('SHOW DATABASES');
    console.log('Databases on TiDB cluster:', dbs);

    const testTables = await prisma.$queryRawUnsafe('SHOW TABLES FROM test');
    console.log('Tables in test db:', testTables);

    // Test creating a backup verification table in test db
    await prisma.$queryRawUnsafe('CREATE TABLE IF NOT EXISTS test.backup_verification_test (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(255), restored_at DATETIME)');
    await prisma.$queryRawUnsafe('INSERT INTO test.backup_verification_test (name, restored_at) VALUES ("pilot_backup_probe", NOW())');
    const records = await prisma.$queryRawUnsafe('SELECT * FROM test.backup_verification_test');
    console.log('Inserted probe in test db:', records);

    // Clean up probe
    await prisma.$queryRawUnsafe('DROP TABLE test.backup_verification_test');
    console.log('Probe table cleaned up successfully.');
  } catch (err) {
    console.error('Error querying databases:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
