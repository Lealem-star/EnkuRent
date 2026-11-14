/**
 * Enqopa RentPro — Safe Financial Reconciliation Script
 * Reconciles simulated test payment CHAPA_1794660420865_LGQCOO
 * Preserves audit history, updates status to REJECTED, and records reconciliation in AuditLog.
 */

import { prisma } from '../config/prisma.js';

async function reconcilePayment() {
  console.log('========================================================================');
  console.log('   ENQOPA RENTPRO — SIMULATED PAYMENT FINANCIAL RECONCILIATION         ');
  console.log('========================================================================\n');

  const txRef = 'CHAPA_1794660420865_LGQCOO';

  // 1. Fetch current payment record
  const payment = await prisma.payment.findFirst({
    where: { txnRef: txRef },
    include: {
      contract: true,
      tenant: true
    }
  });

  if (!payment) {
    console.error(`❌ Payment with txRef ${txRef} not found!`);
    process.exit(1);
  }

  console.log('Found Target Transaction:');
  console.log(`  ID            : ${payment.id}`);
  console.log(`  Amount        : ETB ${Number(payment.amount).toLocaleString()}`);
  console.log(`  Current Status: ${payment.status}`);
  console.log(`  Tenant        : ${payment.tenant?.fullName} (${payment.tenantId})`);
  console.log(`  Contract      : ${payment.contractId} (Status: ${payment.contract?.status})`);
  console.log(`  Office        : ${payment.officeId}\n`);

  if (payment.status !== 'APPROVED') {
    console.log(`ℹ️ Payment status is already ${payment.status}. No status change needed.`);
    return;
  }

  // 2. Perform safe, non-destructive status update
  const updatedPayment = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'REJECTED',
      verifiedBySystem: false,
      rejectionReason: 'SIMULATED_TEST_TRANSACTION_RECONCILED: Provider status at Chapa is pending. Locally injected webhook simulation reversed for financial audit integrity.',
      note: (payment.note || '') + ' [CORRECTED: Simulated test payment transitioned to REJECTED to prevent uncollected money from appearing as collected rent]',
    }
  });

  console.log('✅ Payment status transitioned: APPROVED -> REJECTED');

  // 3. Create immutable audit log entry
  const auditEntry = await prisma.auditLog.create({
    data: {
      actorName: 'System Financial Auditor',
      actorId: 'system_reconciliation_agent',
      action: 'FINANCIAL_RECONCILIATION_CORRECTION',
      entityType: 'Payment',
      entityId: payment.id,
      officeId: payment.officeId,
      meta: JSON.stringify({
        txRef: txRef,
        previousStatus: 'APPROVED',
        newStatus: 'REJECTED',
        amount: Number(payment.amount),
        currency: 'ETB',
        reason: 'Provider status at Chapa is pending. Injected webhook simulation reversed.',
        reconciledAt: new Date().toISOString()
      })
    }
  });

  console.log(`✅ Immutable Audit Log record created (ID: ${auditEntry.id})\n`);

  // 4. Verify post-reconciliation ledger state
  const activeApproved = await prisma.payment.findFirst({
    where: { id: payment.id, status: 'APPROVED' }
  });

  console.log('Verification:');
  console.log(`  Payment appears in APPROVED ledger: ${activeApproved ? 'YES ❌' : 'NO ✅ (Correctly excluded)'}`);
  console.log('========================================================================\n');
}

reconcilePayment()
  .catch(err => {
    console.error('Reconciliation error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
