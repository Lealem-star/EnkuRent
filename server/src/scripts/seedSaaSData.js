import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedSaaSData() {
  console.log('⚡ Seeding Enqopa RentPro SaaS foundation data...');

  // 1. Subscription Plans
  const plans = [
    {
      slug: 'starter',
      name: 'Starter',
      description: 'Perfect for independent landlords managing 1 or 2 small buildings.',
      priceMonthly: 3500.00,
      priceYearly: 35000.00,
      currency: 'ETB',
      maxProperties: 2,
      maxOffices: 15,
      maxStaff: 2,
      trialDays: 14,
      gracePeriodDays: 7,
      isEnterprise: false,
      isActive: true,
      features: JSON.stringify([
        'Up to 15 Offices & Units',
        'Automated Invoices & Overdue Alerts',
        'Tenant Directory & Lease History',
        'Bank Transfer Slip Verification',
        'Email & Phone Support',
      ]),
    },
    {
      slug: 'professional',
      name: 'Professional',
      description: 'Ideal for commercial building owners and active property managers.',
      priceMonthly: 9500.00,
      priceYearly: 95000.00,
      currency: 'ETB',
      maxProperties: 10,
      maxOffices: 75,
      maxStaff: 8,
      trialDays: 14,
      gracePeriodDays: 7,
      isEnterprise: false,
      isActive: true,
      features: JSON.stringify([
        'Up to 75 Offices & Units',
        'Unlimited Leases & Invoices',
        'Multi-Manager & Accountant Scoping',
        'Chapa & Telebirr Payment Gateways',
        'Financial & Collection Reports (PDF/Excel)',
        'Priority Phone & On-Site Support',
      ]),
    },
    {
      slug: 'enterprise',
      name: 'Enterprise',
      description: 'Full capabilities for large real estate complexes and multi-tower portfolios.',
      priceMonthly: 24000.00,
      priceYearly: 240000.00,
      currency: 'ETB',
      maxProperties: 999,
      maxOffices: 9999,
      maxStaff: 999,
      trialDays: 30,
      gracePeriodDays: 14,
      isEnterprise: true,
      isActive: true,
      features: JSON.stringify([
        'Unlimited Units & Commercial Towers',
        'Custom Roles & Building Scoping',
        'Dedicated Account Manager',
        'Custom Data Exports & Audit Logs',
        '24/7 SLA & Custom Integration Stubs',
      ]),
    },
  ];

  for (const p of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { slug: p.slug },
      update: p,
      create: p,
    });
  }
  console.log(`✅ Seeded ${plans.length} subscription plans`);

  // 2. Gateway Configurations
  const gateways = [
    {
      provider: 'CHAPA',
      name: 'Chapa Payment Gateway',
      isEnabled: true,
      isLive: false,
      feePercent: 2.50,
      instructions: 'Online checkout supporting Ethiopian banks, Telebirr, and international cards.',
    },
    {
      provider: 'TELEBIRR',
      name: 'Ethio Telecom Telebirr',
      isEnabled: true,
      isLive: false,
      feePercent: 1.50,
      instructions: 'Native Telebirr merchant integration with instant payment notification.',
    },
    {
      provider: 'CBE_BIRR',
      name: 'Commercial Bank of Ethiopia (CBE Birr)',
      isEnabled: true,
      isLive: false,
      feePercent: 1.00,
      instructions: 'CBE Birr mobile wallet verification & instant bank transfer.',
    },
    {
      provider: 'BANK_TRANSFER',
      name: 'Direct Bank Deposit (CBE, Awash, Dashen)',
      isEnabled: true,
      isLive: true,
      feePercent: 0.00,
      instructions: 'Tenants upload deposit slips; property accountants review and verify receipts.',
    },
  ];

  for (const g of gateways) {
    await prisma.gatewayConfig.upsert({
      where: { provider: g.provider },
      update: { name: g.name, isEnabled: g.isEnabled, isLive: g.isLive, feePercent: g.feePercent, instructions: g.instructions },
      create: g,
    });
  }
  console.log(`✅ Seeded ${gateways.length} payment gateway configurations`);

  // 3. Platform Settings
  const settings = [
    { key: 'app_name', value: 'Enqopa RentPro', category: 'GENERAL', description: 'Product title' },
    { key: 'company_name', value: 'Enqopa Technologies PLC', category: 'GENERAL', description: 'Operating legal entity' },
    { key: 'default_currency', value: 'ETB', category: 'LOCALIZATION', description: 'Primary platform operational currency' },
    { key: 'vat_percent', value: '15', category: 'FINANCIAL', description: 'Ethiopian VAT rate percentage' },
    { key: 'support_email', value: 'support@enqoparentpro.et', category: 'GENERAL', description: 'Platform customer support email' },
    { key: 'support_phone', value: '+251911223344', category: 'GENERAL', description: 'Platform customer support phone' },
    { key: 'grace_period_days', value: '7', category: 'PLATFORM', description: 'Days before past-due subscription is suspended' },
    { key: 'maintenance_mode', value: 'false', category: 'PLATFORM', description: 'Flag to put platform in maintenance mode' },
  ];

  for (const s of settings) {
    await prisma.platformSetting.upsert({
      where: { key: s.key },
      update: { value: s.value, description: s.description, category: s.category },
      create: s,
    });
  }
  console.log(`✅ Seeded ${settings.length} platform configuration settings`);

  // 4. Default Active Subscription for Test Owner (Meseret Alemayehu)
  const owner = await prisma.user.findFirst({
    where: { role: 'OWNER', email: 'owner@enqoparentpro.et' },
  });

  const proPlan = await prisma.subscriptionPlan.findUnique({
    where: { slug: 'professional' },
  });

  if (owner && proPlan) {
    const existingSub = await prisma.subscription.findFirst({
      where: { ownerId: owner.id },
    });

    if (!existingSub) {
      const now = new Date();
      const oneYearLater = new Date(now);
      oneYearLater.setFullYear(now.getFullYear() + 1);

      const sub = await prisma.subscription.create({
        data: {
          ownerId: owner.id,
          planId: proPlan.id,
          billingCycle: 'YEARLY',
          status: 'ACTIVE',
          amount: proPlan.priceYearly,
          currency: 'ETB',
          startDate: now,
          endDate: oneYearLater,
          renewsAt: oneYearLater,
          notes: 'Initial seeded annual professional subscription for demo owner.',
        },
      });

      // Also create sample subscription invoice
      await prisma.subscriptionInvoice.create({
        data: {
          subscriptionId: sub.id,
          ownerId: owner.id,
          invoiceNumber: 'INV-2026-0001',
          amount: proPlan.priceYearly,
          currency: 'ETB',
          billingCycle: 'YEARLY',
          period: 'Annual 2026-2027',
          status: 'APPROVED',
          paymentMethod: 'BANK_TRANSFER',
          txnRef: 'TXN_SUB_ENQOPA_001',
          paidAt: now,
        },
      });

      console.log('✅ Created initial active subscription & invoice for owner Meseret Alemayehu');
    }
  }

  console.log('🎉 Enqopa RentPro SaaS foundation setup complete!');
}

seedSaaSData()
  .catch((e) => {
    console.error('❌ Error during SaaS seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
