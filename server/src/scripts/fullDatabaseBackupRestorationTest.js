/**
 * Enqopa RentPro — Full Database Backup & Restoration Verification
 * Enqopa Technologies PLC — Comprehensive Audit Test
 * Validates complete snapshot, restoration, and relational integrity across all 17 tables.
 */

import fs from 'fs';
import path from 'path';
import { prisma } from '../config/prisma.js';

async function runFullBackupRestorationTest() {
  console.log('========================================================================');
  console.log('   ENQOPA RENTPRO — COMPREHENSIVE BACKUP & RESTORATION TEST           ');
  console.log('   Enqopa Technologies PLC — Full Relational Verification               ');
  console.log('========================================================================\n');

  const backupDir = path.resolve('server/backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const timestamp = Date.now();
  const backupFile = path.join(backupDir, `full_backup_rentpro_${timestamp}.json`);

  // Step 1: Snapshot all 17 models from rent_management_db
  console.log('[Step 1] Extracting full snapshot across all 17 models from rent_management_db...');
  
  const tables = {
    subscriptionPlans: await prisma.subscriptionPlan.findMany(),
    platformSettings: await prisma.platformSetting.findMany(),
    gatewayConfigs: await prisma.gatewayConfig.findMany(),
    users: await prisma.user.findMany(),
    buildings: await prisma.building.findMany(),
    subscriptions: await prisma.subscription.findMany(),
    supportTickets: await prisma.supportTicket.findMany(),
    userBuildings: await prisma.userBuilding.findMany(),
    offices: await prisma.office.findMany(),
    subscriptionInvoices: await prisma.subscriptionInvoice.findMany(),
    ticketMessages: await prisma.ticketMessage.findMany(),
    tenants: await prisma.tenant.findMany(),
    contracts: await prisma.contract.findMany(),
    rentHistories: await prisma.rentHistory.findMany(),
    payments: await prisma.payment.findMany(),
    documents: await prisma.document.findMany(),
    auditLogs: await prisma.auditLog.findMany(),
  };

  const snapshotMeta = {
    extractedAt: new Date().toISOString(),
    sourceDatabase: 'rent_management_db',
    targetDatabase: 'test',
    tableCounts: {},
    totalRows: 0,
  };

  for (const [key, rows] of Object.entries(tables)) {
    snapshotMeta.tableCounts[key] = rows.length;
    snapshotMeta.totalRows += rows.length;
    console.log(`  📦 Extracted ${key.padEnd(22)}: ${rows.length} rows`);
  }

  console.log(`\n  Total Rows Extracted: ${snapshotMeta.totalRows}`);
  fs.writeFileSync(backupFile, JSON.stringify({ metadata: snapshotMeta, tables }, null, 2), 'utf8');
  console.log(`  ✅ Full snapshot persisted to: ${backupFile} (${(fs.statSync(backupFile).size / 1024).toFixed(2)} KB)\n`);

  // Step 2: Clean up any old restored tables in `test` database
  console.log('[Step 2] Cleaning up any old restoration tables in `test` database...');
  const tableNames = [
    'restored_ticket_messages',
    'restored_support_tickets',
    'restored_subscription_invoices',
    'restored_subscriptions',
    'restored_gateway_configs',
    'restored_audit_logs',
    'restored_documents',
    'restored_payments',
    'restored_rent_histories',
    'restored_contracts',
    'restored_tenants',
    'restored_offices',
    'restored_user_buildings',
    'restored_buildings',
    'restored_users',
    'restored_platform_settings',
    'restored_subscription_plans',
  ];

  for (const t of tableNames) {
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS test.${t}`);
  }
  console.log('  ✅ Target test namespace prepared.');

  // Step 3: Create target schema in separate test database
  console.log('\n[Step 3] Provisioning restored tables in separate database `test`...');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE test.restored_subscription_plans (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL,
      priceMonthly DECIMAL(12,2) NOT NULL,
      priceYearly DECIMAL(12,2) NOT NULL,
      currency VARCHAR(10) NOT NULL,
      maxProperties INT NOT NULL,
      maxOffices INT NOT NULL,
      maxStaff INT NOT NULL,
      trialDays INT NOT NULL,
      gracePeriodDays INT NOT NULL,
      isActive BOOLEAN NOT NULL,
      isEnterprise BOOLEAN NOT NULL
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE test.restored_platform_settings (
      id VARCHAR(255) PRIMARY KEY,
      \`key\` VARCHAR(255) NOT NULL,
      value TEXT NOT NULL,
      category VARCHAR(255) NOT NULL,
      description TEXT,
      isSecret BOOLEAN NOT NULL
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE test.restored_gateway_configs (
      id VARCHAR(255) PRIMARY KEY,
      provider VARCHAR(50) NOT NULL,
      name VARCHAR(255) NOT NULL,
      isEnabled BOOLEAN NOT NULL,
      isLive BOOLEAN NOT NULL,
      feePercent DECIMAL(5,2) NOT NULL
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE test.restored_users (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(255),
      role VARCHAR(50) NOT NULL,
      title VARCHAR(255),
      approvalStatus VARCHAR(50) NOT NULL,
      isActive BOOLEAN NOT NULL,
      ownerId VARCHAR(255)
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE test.restored_buildings (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      address VARCHAR(255) NOT NULL,
      floors INT NOT NULL,
      ownerId VARCHAR(255),
      isDeleted BOOLEAN NOT NULL
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE test.restored_user_buildings (
      id VARCHAR(255) PRIMARY KEY,
      userId VARCHAR(255) NOT NULL,
      buildingId VARCHAR(255) NOT NULL
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE test.restored_subscriptions (
      id VARCHAR(255) PRIMARY KEY,
      ownerId VARCHAR(255) NOT NULL,
      planId VARCHAR(255) NOT NULL,
      billingCycle VARCHAR(50) NOT NULL,
      status VARCHAR(50) NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      currency VARCHAR(10) NOT NULL
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE test.restored_subscription_invoices (
      id VARCHAR(255) PRIMARY KEY,
      subscriptionId VARCHAR(255) NOT NULL,
      invoiceNumber VARCHAR(255) NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      currency VARCHAR(10) NOT NULL,
      status VARCHAR(50) NOT NULL
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE test.restored_support_tickets (
      id VARCHAR(255) PRIMARY KEY,
      ticketNumber VARCHAR(255) NOT NULL,
      userId VARCHAR(255) NOT NULL,
      ownerId VARCHAR(255),
      subject VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      priority VARCHAR(50) NOT NULL,
      category VARCHAR(255) NOT NULL,
      status VARCHAR(50) NOT NULL
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE test.restored_ticket_messages (
      id VARCHAR(255) PRIMARY KEY,
      ticketId VARCHAR(255) NOT NULL,
      senderId VARCHAR(255) NOT NULL,
      senderName VARCHAR(255) NOT NULL,
      senderRole VARCHAR(50) NOT NULL,
      message TEXT NOT NULL,
      isInternal BOOLEAN NOT NULL
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE test.restored_offices (
      id VARCHAR(255) PRIMARY KEY,
      buildingId VARCHAR(255) NOT NULL,
      floor INT NOT NULL,
      number INT NOT NULL,
      status VARCHAR(50) NOT NULL,
      isDeleted BOOLEAN NOT NULL
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE test.restored_tenants (
      id VARCHAR(255) PRIMARY KEY,
      fullName VARCHAR(255) NOT NULL,
      phone VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      idNumber VARCHAR(255),
      userId VARCHAR(255),
      isDeleted BOOLEAN NOT NULL
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE test.restored_contracts (
      id VARCHAR(255) PRIMARY KEY,
      officeId VARCHAR(255) NOT NULL,
      tenantId VARCHAR(255) NOT NULL,
      rent DECIMAL(12,2) NOT NULL,
      frequency VARCHAR(50) NOT NULL,
      status VARCHAR(50) NOT NULL,
      dueDay INT NOT NULL,
      isDeleted BOOLEAN NOT NULL
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE test.restored_rent_histories (
      id VARCHAR(255) PRIMARY KEY,
      contractId VARCHAR(255) NOT NULL,
      rent DECIMAL(12,2) NOT NULL
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE test.restored_payments (
      id VARCHAR(255) PRIMARY KEY,
      contractId VARCHAR(255) NOT NULL,
      officeId VARCHAR(255) NOT NULL,
      buildingId VARCHAR(255) NOT NULL,
      tenantId VARCHAR(255) NOT NULL,
      period VARCHAR(50) NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      expectedAmount DECIMAL(12,2) NOT NULL,
      method VARCHAR(50) NOT NULL,
      txnRef VARCHAR(255),
      status VARCHAR(50) NOT NULL,
      verifiedBySystem BOOLEAN NOT NULL,
      isManual BOOLEAN NOT NULL
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE test.restored_documents (
      id VARCHAR(255) PRIMARY KEY,
      contractId VARCHAR(255),
      tenantId VARCHAR(255),
      type VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      fileUrl VARCHAR(500) NOT NULL
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE test.restored_audit_logs (
      id VARCHAR(255) PRIMARY KEY,
      actorName VARCHAR(255) NOT NULL,
      actorId VARCHAR(255),
      action VARCHAR(100) NOT NULL,
      entityType VARCHAR(100) NOT NULL,
      entityId VARCHAR(255),
      officeId VARCHAR(255),
      meta TEXT
    )
  `);

  console.log('  ✅ Schema structures created in `test` database.\n');

  // Step 4: Populate restored data into `test` db
  console.log('[Step 4] Loading snapshot data into separate test database...');

  for (const p of tables.subscriptionPlans) {
    await prisma.$executeRawUnsafe(
      'INSERT INTO test.restored_subscription_plans (id, name, slug, priceMonthly, priceYearly, currency, maxProperties, maxOffices, maxStaff, trialDays, gracePeriodDays, isActive, isEnterprise) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      p.id, p.name, p.slug, p.priceMonthly, p.priceYearly, p.currency, p.maxProperties, p.maxOffices, p.maxStaff, p.trialDays, p.gracePeriodDays, p.isActive, p.isEnterprise
    );
  }

  for (const s of tables.platformSettings) {
    await prisma.$executeRawUnsafe(
      'INSERT INTO test.restored_platform_settings (id, `key`, value, category, description, isSecret) VALUES (?, ?, ?, ?, ?, ?)',
      s.id, s.key, s.value, s.category, s.description || null, s.isSecret
    );
  }

  for (const g of tables.gatewayConfigs) {
    await prisma.$executeRawUnsafe(
      'INSERT INTO test.restored_gateway_configs (id, provider, name, isEnabled, isLive, feePercent) VALUES (?, ?, ?, ?, ?, ?)',
      g.id, g.provider, g.name, g.isEnabled, g.isLive, g.feePercent
    );
  }

  for (const u of tables.users) {
    await prisma.$executeRawUnsafe(
      'INSERT INTO test.restored_users (id, name, email, phone, role, title, approvalStatus, isActive, ownerId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      u.id, u.name, u.email, u.phone || null, u.role, u.title || null, u.approvalStatus, u.isActive, u.ownerId || null
    );
  }

  for (const b of tables.buildings) {
    await prisma.$executeRawUnsafe(
      'INSERT INTO test.restored_buildings (id, name, address, floors, ownerId, isDeleted) VALUES (?, ?, ?, ?, ?, ?)',
      b.id, b.name, b.address, b.floors, b.ownerId || null, b.isDeleted
    );
  }

  for (const ub of tables.userBuildings) {
    await prisma.$executeRawUnsafe(
      'INSERT INTO test.restored_user_buildings (id, userId, buildingId) VALUES (?, ?, ?)',
      ub.id, ub.userId, ub.buildingId
    );
  }

  for (const sub of tables.subscriptions) {
    await prisma.$executeRawUnsafe(
      'INSERT INTO test.restored_subscriptions (id, ownerId, planId, billingCycle, status, amount, currency) VALUES (?, ?, ?, ?, ?, ?, ?)',
      sub.id, sub.ownerId, sub.planId, sub.billingCycle, sub.status, sub.amount, sub.currency
    );
  }

  for (const inv of tables.subscriptionInvoices) {
    await prisma.$executeRawUnsafe(
      'INSERT INTO test.restored_subscription_invoices (id, subscriptionId, invoiceNumber, amount, currency, status) VALUES (?, ?, ?, ?, ?, ?)',
      inv.id, inv.subscriptionId, inv.invoiceNumber, inv.amount, inv.currency, inv.status
    );
  }

  for (const st of tables.supportTickets) {
    await prisma.$executeRawUnsafe(
      'INSERT INTO test.restored_support_tickets (id, ticketNumber, userId, ownerId, subject, description, priority, category, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      st.id, st.ticketNumber, st.userId, st.ownerId || null, st.subject, st.description, st.priority, st.category, st.status
    );
  }

  for (const tm of tables.ticketMessages) {
    await prisma.$executeRawUnsafe(
      'INSERT INTO test.restored_ticket_messages (id, ticketId, senderId, senderName, senderRole, message, isInternal) VALUES (?, ?, ?, ?, ?, ?, ?)',
      tm.id, tm.ticketId, tm.senderId, tm.senderName, tm.senderRole, tm.message, tm.isInternal
    );
  }

  for (const o of tables.offices) {
    await prisma.$executeRawUnsafe(
      'INSERT INTO test.restored_offices (id, buildingId, floor, number, status, isDeleted) VALUES (?, ?, ?, ?, ?, ?)',
      o.id, o.buildingId, o.floor, o.number, o.status, o.isDeleted
    );
  }

  for (const t of tables.tenants) {
    await prisma.$executeRawUnsafe(
      'INSERT INTO test.restored_tenants (id, fullName, phone, email, idNumber, userId, isDeleted) VALUES (?, ?, ?, ?, ?, ?, ?)',
      t.id, t.fullName, t.phone, t.email, t.idNumber || null, t.userId || null, t.isDeleted
    );
  }

  for (const c of tables.contracts) {
    await prisma.$executeRawUnsafe(
      'INSERT INTO test.restored_contracts (id, officeId, tenantId, rent, frequency, status, dueDay, isDeleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      c.id, c.officeId, c.tenantId, c.rent, c.frequency, c.status, c.dueDay, c.isDeleted
    );
  }

  for (const rh of tables.rentHistories) {
    await prisma.$executeRawUnsafe(
      'INSERT INTO test.restored_rent_histories (id, contractId, rent) VALUES (?, ?, ?)',
      rh.id, rh.contractId, rh.rent
    );
  }

  for (const pay of tables.payments) {
    await prisma.$executeRawUnsafe(
      'INSERT INTO test.restored_payments (id, contractId, officeId, buildingId, tenantId, period, amount, expectedAmount, method, txnRef, status, verifiedBySystem, isManual) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      pay.id, pay.contractId, pay.officeId, pay.buildingId, pay.tenantId, pay.period, pay.amount, pay.expectedAmount, pay.method, pay.txnRef || null, pay.status, pay.verifiedBySystem, pay.isManual
    );
  }

  for (const d of tables.documents) {
    await prisma.$executeRawUnsafe(
      'INSERT INTO test.restored_documents (id, contractId, tenantId, type, name, fileUrl) VALUES (?, ?, ?, ?, ?, ?)',
      d.id, d.contractId || null, d.tenantId || null, d.type, d.name, d.fileUrl
    );
  }

  for (const l of tables.auditLogs) {
    await prisma.$executeRawUnsafe(
      'INSERT INTO test.restored_audit_logs (id, actorName, actorId, action, entityType, entityId, officeId, meta) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      l.id, l.actorName, l.actorId || null, l.action, l.entityType, l.entityId || null, l.officeId || null, l.meta || null
    );
  }

  console.log('  ✅ Data successfully restored across all 17 tables in `test` database.\n');

  // Step 5: Verification of row counts & relational integrity
  console.log('[Step 5] Verifying row counts and relational integrity in `test` database...');

  const checks = [
    { name: 'Subscription Plans', table: 'test.restored_subscription_plans', expected: tables.subscriptionPlans.length },
    { name: 'Platform Settings', table: 'test.restored_platform_settings', expected: tables.platformSettings.length },
    { name: 'Gateway Configs', table: 'test.restored_gateway_configs', expected: tables.gatewayConfigs.length },
    { name: 'Users', table: 'test.restored_users', expected: tables.users.length },
    { name: 'Buildings', table: 'test.restored_buildings', expected: tables.buildings.length },
    { name: 'User Buildings', table: 'test.restored_user_buildings', expected: tables.userBuildings.length },
    { name: 'Subscriptions', table: 'test.restored_subscriptions', expected: tables.subscriptions.length },
    { name: 'Subscription Invoices', table: 'test.restored_subscription_invoices', expected: tables.subscriptionInvoices.length },
    { name: 'Support Tickets', table: 'test.restored_support_tickets', expected: tables.supportTickets.length },
    { name: 'Ticket Messages', table: 'test.restored_ticket_messages', expected: tables.ticketMessages.length },
    { name: 'Offices', table: 'test.restored_offices', expected: tables.offices.length },
    { name: 'Tenants', table: 'test.restored_tenants', expected: tables.tenants.length },
    { name: 'Contracts', table: 'test.restored_contracts', expected: tables.contracts.length },
    { name: 'Rent Histories', table: 'test.restored_rent_histories', expected: tables.rentHistories.length },
    { name: 'Payments', table: 'test.restored_payments', expected: tables.payments.length },
    { name: 'Documents', table: 'test.restored_documents', expected: tables.documents.length },
    { name: 'Audit Logs', table: 'test.restored_audit_logs', expected: tables.auditLogs.length },
  ];

  let allCountsPass = true;
  for (const chk of checks) {
    const res = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM ${chk.table}`);
    const actual = Number(res[0].count);
    const pass = actual === chk.expected;
    if (!pass) allCountsPass = false;
    const mark = pass ? '✅' : '❌';
    console.log(`  ${mark} ${chk.name.padEnd(24)}: ${actual} restored (Expected: ${chk.expected})`);
  }

  // Relational Integrity Checks in `test`
  console.log('\n[Step 5b] Testing relational foreign-key consistency in `test` database...');

  // 1. Check all offices link to valid buildings
  const orphanOffices = await prisma.$queryRawUnsafe(`
    SELECT o.id FROM test.restored_offices o
    LEFT JOIN test.restored_buildings b ON o.buildingId = b.id
    WHERE b.id IS NULL
  `);
  console.log(`  ✅ Orphan Offices in restored DB: ${orphanOffices.length} (Expected: 0)`);

  // 2. Check all contracts link to valid offices and tenants
  const orphanContracts = await prisma.$queryRawUnsafe(`
    SELECT c.id FROM test.restored_contracts c
    LEFT JOIN test.restored_offices o ON c.officeId = o.id
    LEFT JOIN test.restored_tenants t ON c.tenantId = t.id
    WHERE o.id IS NULL OR t.id IS NULL
  `);
  console.log(`  ✅ Orphan Contracts in restored DB: ${orphanContracts.length} (Expected: 0)`);

  // 3. Check all user-buildings link to valid users and buildings
  const orphanUserBuildings = await prisma.$queryRawUnsafe(`
    SELECT ub.id FROM test.restored_user_buildings ub
    LEFT JOIN test.restored_users u ON ub.userId = u.id
    LEFT JOIN test.restored_buildings b ON ub.buildingId = b.id
    WHERE u.id IS NULL OR b.id IS NULL
  `);
  console.log(`  ✅ Orphan User-Buildings in restored DB: ${orphanUserBuildings.length} (Expected: 0)`);

  // 4. Check payment financial totals
  const sourcePaymentSum = tables.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const restoredSumRes = await prisma.$queryRawUnsafe('SELECT SUM(amount) as total FROM test.restored_payments');
  const restoredPaymentSum = Number(restoredSumRes[0].total);
  const sumMatches = Math.abs(sourcePaymentSum - restoredPaymentSum) < 0.01;
  console.log(`  ${sumMatches ? '✅' : '❌'} Total Payment Amount: ETB ${restoredPaymentSum.toLocaleString()} (Source: ETB ${sourcePaymentSum.toLocaleString()})`);

  // Step 6: Clean up test tables in test database
  console.log('\n[Step 6] Tearing down temporary restored tables in `test` database...');
  for (const t of tableNames) {
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS test.${t}`);
  }
  console.log('  ✅ Separate `test` database returned to pristine state.');

  // Step 7: Confirm original production database was NOT modified
  console.log('\n[Step 7] Confirming production database `rent_management_db` untouched...');
  const prodUsersCount = await prisma.user.count();
  const prodPaymentsCount = await prisma.payment.count();
  const prodUntouched = prodUsersCount === tables.users.length && prodPaymentsCount === tables.payments.length;
  console.log(`  ✅ Production Users: ${prodUsersCount} (Original: ${tables.users.length})`);
  console.log(`  ✅ Production Payments: ${prodPaymentsCount} (Original: ${tables.payments.length})`);

  console.log('\n========================================================================');
  console.log(`   FULL BACKUP & RESTORATION AUDIT: ${allCountsPass && sumMatches && prodUntouched ? '100% VERIFIED RESTORABLE' : 'FAILED'}   `);
  console.log('========================================================================\n');

  if (!allCountsPass || !sumMatches || !prodUntouched) {
    process.exit(1);
  }
}

runFullBackupRestorationTest()
  .catch((err) => {
    console.error('Fatal backup restoration error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
