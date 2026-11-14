import { prisma } from '../config/prisma.js';

async function inspect() {
  const p = await prisma.payment.findFirst({
    where: { txnRef: 'CHAPA_1794660420865_LGQCOO' },
    include: {
      contract: {
        include: {
          office: { include: { building: true } },
          tenant: true,
          rentHistories: true
        }
      },
      tenant: true,
      building: true
    }
  });

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entityId: p?.id },
        { meta: { contains: 'CHAPA_1794660420865_LGQCOO' } }
      ]
    }
  });

  console.log('PAYMENT_DATA:', JSON.stringify(p, null, 2));
  console.log('ASSOCIATED_AUDIT_LOGS:', JSON.stringify(auditLogs, null, 2));

  // Check tenant financial calculations
  if (p) {
    const allTenantPayments = await prisma.payment.findMany({
      where: { tenantId: p.tenantId }
    });
    console.log(`Tenant has ${allTenantPayments.length} total payments.`);
    const approvedPayments = allTenantPayments.filter(pay => pay.status === 'APPROVED');
    console.log(`Tenant has ${approvedPayments.length} approved payments. Total: ETB ${approvedPayments.reduce((s, x) => s + Number(x.amount), 0)}`);
  }
}

inspect().finally(() => prisma.$disconnect());
