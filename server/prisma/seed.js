import { PrismaClient, Role, OfficeStatus, ContractFrequency, ContractStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const uid = (p) => p + '_' + Math.random().toString(36).slice(2, 9);
const NOW = new Date('2026-09-21T10:00:00Z');

const NAMES = [
  'Abebe Kebede',
  'Hana Girma',
  'Selam Tesfaye',
  'Dawit Alemu',
  'Meron Bekele',
  'Yonas Tadesse',
  'Bethlehem Fikre',
  'Kaleb Worku',
  'Rahel Assefa',
  'Mikiyas Solomon',
  'Sara Mulugeta',
  'Tariku Getachew',
  'Hiwot Desta',
  'Nathnael Mesfin',
  'Eden Haile',
  'Biruk Amare',
  'Frehiwot Alemu',
  'Yordanos Kifle',
];

async function main() {
  console.log('🌱 Seeding Enqopa RentPro database...');

  // 1. Clean existing records in reverse relation order
  await prisma.auditLog.deleteMany();
  await prisma.document.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.rentHistory.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.office.deleteMany();
  await prisma.userBuilding.deleteMany();
  await prisma.building.deleteMany();
  await prisma.user.deleteMany();

  const defaultPassword = await bcrypt.hash('password123', 10);
  const ownerPassword = await bcrypt.hash('admin123', 10);

  // 2. Create Owner
  const owner = await prisma.user.create({
    data: {
      id: 'usr_owner_1',
      name: 'Meseret Alemayehu',
      email: 'owner@enqoparentpro.et',
      phone: '0911000000',
      passwordHash: ownerPassword,
      role: Role.OWNER,
      title: 'Owner',
      isActive: true,
    },
  });

  // 3. Create Managers
  const accountant = await prisma.user.create({
    data: {
      id: 'm1',
      name: 'Selamawit Fikru',
      email: 'selam.fikru@enqoparentpro.et',
      phone: '0911223344',
      passwordHash: defaultPassword,
      role: Role.MANAGER,
      title: 'Accountant',
      isActive: true,
    },
  });

  const manager = await prisma.user.create({
    data: {
      id: 'm2',
      name: 'Getnet Alemayehu',
      email: 'getnet.a@enqoparentpro.et',
      phone: '0911556677',
      passwordHash: defaultPassword,
      role: Role.MANAGER,
      title: 'Manager',
      isActive: true,
    },
  });

  console.log('✅ Staff users created (Owner, Accountant, Manager)');

  // 4. Create Buildings
  const abcBuilding = await prisma.building.create({
    data: {
      id: 'abc',
      name: 'ABC Business Center',
      address: 'Bole Road, Addis Ababa',
      floors: 3,
    },
  });

  const xyzBuilding = await prisma.building.create({
    data: {
      id: 'xyz',
      name: 'XYZ Office Building',
      address: 'Kazanchis, Addis Ababa',
      floors: 2,
    },
  });

  console.log('✅ Buildings created (ABC & XYZ)');

  // 5. Assign Building Scopes
  // Selamawit (Accountant) has access to both ABC and XYZ
  await prisma.userBuilding.createMany({
    data: [
      { userId: accountant.id, buildingId: abcBuilding.id },
      { userId: accountant.id, buildingId: xyzBuilding.id },
      // Getnet (Manager) has access to ABC only
      { userId: manager.id, buildingId: abcBuilding.id },
    ],
  });

  console.log('✅ User-Building permissions linked (Selamawit: ABC+XYZ, Getnet: ABC)');

  // 6. Create Offices (6 offices per floor)
  const buildings = [abcBuilding, xyzBuilding];
  const allOffices = [];
  let nameIdx = 0;

  for (const b of buildings) {
    for (let f = 1; f <= b.floors; f++) {
      for (let n = 1; n <= 6; n++) {
        const num = f * 100 + n;
        // Deterministic status pattern matching prototype:
        // floor 1 office 6 available, floor 2 office 6 maintenance, floor 3 office 5 available
        let status = OfficeStatus.OCCUPIED;
        if ((f === 1 && n === 6) || (f === 3 && n === 5)) {
          status = OfficeStatus.AVAILABLE;
        } else if (f === 2 && n === 6) {
          status = OfficeStatus.MAINTENANCE;
        }

        const office = await prisma.office.create({
          data: {
            id: `off_${b.id}_${num}`,
            buildingId: b.id,
            floor: f,
            number: num,
            status,
          },
        });
        allOffices.push(office);
      }
    }
  }

  console.log(`✅ ${allOffices.length} Offices created across both buildings`);

  // 7. Create Tenants, Contracts, Rent History, and Payments
  const occupiedOffices = allOffices.filter((o) => o.status === OfficeStatus.OCCUPIED);
  const rentTiers = [12000, 15000, 18000, 20000, 22000, 25000, 28000, 32000, 35000];
  const auditEntries = [];

  for (let i = 0; i < occupiedOffices.length; i++) {
    const o = occupiedOffices[i];
    const name = NAMES[nameIdx % NAMES.length];
    nameIdx++;

    const baseEmail = name.toLowerCase().replace(/\s+/g, '.');
    const email = i < NAMES.length ? `${baseEmail}@gmail.com` : `${baseEmail}.${o.number}@gmail.com`;
    const phone = `09${Math.floor(10000000 + Math.random() * 89999999)}`;
    const rentBase = rentTiers[i % rentTiers.length];

    // Create user account for tenant
    const tenantUser = await prisma.user.create({
      data: {
        id: `usr_${o.id}`,
        name,
        email,
        phone,
        passwordHash: defaultPassword,
        role: Role.TENANT,
        title: 'Tenant',
        isActive: true,
      },
    });

    // Create tenant profile
    const tenant = await prisma.tenant.create({
      data: {
        id: `ten_${o.id}`,
        userId: tenantUser.id,
        fullName: name,
        phone,
        email,
        idNumber: `ET-${100000 + i}`,
      },
    });

    const isExpiringSoon = i === 1; // Make 2nd contract expiring soon (< 45 days)
    const startDate = new Date('2025-01-01');
    const endDate = isExpiringSoon ? new Date('2026-10-15') : new Date('2026-12-31');

    // Create Contract
    const contract = await prisma.contract.create({
      data: {
        id: `cnt_${o.id}`,
        officeId: o.id,
        tenantId: tenant.id,
        rent: rentBase,
        frequency: ContractFrequency.MONTHLY,
        startDate,
        endDate,
        dueDay: 5,
        status: ContractStatus.ACTIVE,
      },
    });

    // Rent History (e.g. rent increase from prior year)
    if (i % 2 === 0) {
      await prisma.rentHistory.create({
        data: {
          contractId: contract.id,
          rent: rentBase - 3000,
          effectiveFrom: new Date('2025-01-01'),
          effectiveTo: new Date('2025-12-31'),
        },
      });
      await prisma.rentHistory.create({
        data: {
          contractId: contract.id,
          rent: rentBase,
          effectiveFrom: new Date('2026-01-01'),
        },
      });
    }

    // Documents
    await prisma.document.createMany({
      data: [
        {
          contractId: contract.id,
          tenantId: tenant.id,
          type: 'Lease Agreement',
          name: 'Lease Agreement.pdf',
          fileUrl: '/uploads/sample_lease.pdf',
        },
        {
          contractId: contract.id,
          tenantId: tenant.id,
          type: 'Tenant ID',
          name: 'Tenant ID Copy.pdf',
          fileUrl: '/uploads/sample_id.pdf',
        },
      ],
    });

    // 8. Generate Payment History: June 2026, July 2026, August 2026 (all approved)
    const pastMonths = [
      { y: 2026, m: 6, label: 'June 2026' },
      { y: 2026, m: 7, label: 'July 2026' },
      { y: 2026, m: 8, label: 'August 2026' },
    ];

    const methods = [
      PaymentMethod.CHAPA,
      PaymentMethod.TELEBIRR,
      PaymentMethod.CBE_BIRR,
      PaymentMethod.BANK_TRANSFER,
    ];

    for (const mo of pastMonths) {
      const dueDate = new Date(`${mo.y}-${String(mo.m).padStart(2, '0')}-05T00:00:00Z`);
      const payDate = new Date(`${mo.y}-${String(mo.m).padStart(2, '0')}-03T11:00:00Z`);
      const chosenMethod = methods[(i + mo.m) % methods.length];
      const txn = `TXN${Math.floor(100000 + Math.random() * 899999)}`;

      await prisma.payment.create({
        data: {
          contractId: contract.id,
          officeId: o.id,
          buildingId: o.buildingId,
          tenantId: tenant.id,
          period: mo.label,
          expectedAmount: rentBase,
          amount: rentBase,
          dueDate,
          paymentDate: payDate,
          submittedAt: payDate,
          method: chosenMethod,
          txnRef: txn,
          status: PaymentStatus.APPROVED,
          verifiedById: accountant.id,
          verifiedBySystem: chosenMethod !== PaymentMethod.BANK_TRANSFER,
        },
      });
    }

    // 9. Current Cycle (September 2026) Variations
    const sepDueDate = new Date('2026-09-05T00:00:00Z');
    const cycleType = i % 4; // 0: Paid, 1: Pending Verification, 2: Overdue (unpaid), 3: Rejected

    if (cycleType === 0) {
      // Paid
      const txn = `TXN${Math.floor(100000 + Math.random() * 899999)}`;
      await prisma.payment.create({
        data: {
          contractId: contract.id,
          officeId: o.id,
          buildingId: o.buildingId,
          tenantId: tenant.id,
          period: 'September 2026',
          expectedAmount: rentBase,
          amount: rentBase,
          dueDate: sepDueDate,
          paymentDate: new Date('2026-09-03T14:30:00Z'),
          submittedAt: new Date('2026-09-03T14:30:00Z'),
          method: PaymentMethod.TELEBIRR,
          txnRef: txn,
          status: PaymentStatus.APPROVED,
          verifiedById: accountant.id,
          verifiedBySystem: true,
        },
      });
      auditEntries.push({
        actorName: 'System',
        action: 'PAYMENT_APPROVED',
        entityType: 'PAYMENT',
        entityId: txn,
        officeId: o.id,
        meta: `Auto-verified Telebirr payment of ETB ${rentBase}`,
      });
    } else if (cycleType === 1) {
      // Pending review
      const txn = `TXN${Math.floor(100000 + Math.random() * 899999)}`;
      await prisma.payment.create({
        data: {
          contractId: contract.id,
          officeId: o.id,
          buildingId: o.buildingId,
          tenantId: tenant.id,
          period: 'September 2026',
          expectedAmount: rentBase,
          amount: rentBase,
          dueDate: sepDueDate,
          paymentDate: new Date('2026-09-18T09:15:00Z'),
          submittedAt: new Date('2026-09-18T09:15:00Z'),
          method: PaymentMethod.BANK_TRANSFER,
          txnRef: txn,
          status: PaymentStatus.PENDING,
          note: 'Deposited at CBE Bole branch, deposit slip attached.',
          receiptUrl: '/uploads/sample_receipt.jpg',
        },
      });
      auditEntries.push({
        actorName: tenant.fullName,
        action: 'PAYMENT_SUBMITTED',
        entityType: 'PAYMENT',
        entityId: txn,
        officeId: o.id,
        meta: `Submitted receipt of ETB ${rentBase} via Bank Transfer`,
      });
    } else if (cycleType === 2) {
      // Overdue — no payment recorded for September
      auditEntries.push({
        actorName: 'System Cron',
        action: 'PAYMENT_OVERDUE',
        entityType: 'CONTRACT',
        entityId: contract.id,
        officeId: o.id,
        meta: `September 2026 rent of ETB ${rentBase} flagged as Overdue (past Sep 5)`,
      });
    } else if (cycleType === 3) {
      // Rejected
      const txn = `TXN${Math.floor(100000 + Math.random() * 899999)}`;
      await prisma.payment.create({
        data: {
          contractId: contract.id,
          officeId: o.id,
          buildingId: o.buildingId,
          tenantId: tenant.id,
          period: 'September 2026',
          expectedAmount: rentBase,
          amount: rentBase - 3000,
          dueDate: sepDueDate,
          paymentDate: new Date('2026-09-10T16:00:00Z'),
          submittedAt: new Date('2026-09-10T16:00:00Z'),
          method: PaymentMethod.BANK_TRANSFER,
          txnRef: txn,
          status: PaymentStatus.REJECTED,
          verifiedById: accountant.id,
          rejectionReason: 'Amount does not match expected rent.',
          receiptUrl: '/uploads/sample_receipt.jpg',
        },
      });
      auditEntries.push({
        actorName: accountant.name,
        action: 'PAYMENT_REJECTED',
        entityType: 'PAYMENT',
        entityId: txn,
        officeId: o.id,
        meta: `Rejected payment: Amount does not match expected rent.`,
      });
    }
  }

  // 10. Manual Payment Example (by Getnet Alemayehu for Office 101)
  const firstOcc = occupiedOffices[0];
  if (firstOcc) {
    const manualTxn = 'CASH_REC_001';
    await prisma.payment.create({
      data: {
        contractId: `cnt_${firstOcc.id}`,
        officeId: firstOcc.id,
        buildingId: firstOcc.buildingId,
        tenantId: `ten_${firstOcc.id}`,
        period: 'May 2026',
        expectedAmount: 18000,
        amount: 18000,
        dueDate: new Date('2026-05-05T00:00:00Z'),
        paymentDate: new Date('2026-05-06T10:00:00Z'),
        submittedAt: new Date('2026-05-06T10:00:00Z'),
        method: PaymentMethod.CASH,
        txnRef: manualTxn,
        status: PaymentStatus.APPROVED,
        verifiedById: manager.id,
        isManual: true,
        note: 'Paid in cash at management office. Official receipt issued.',
      },
    });
    auditEntries.push({
      actorName: manager.name,
      action: 'MANUAL_PAYMENT_RECORDED',
      entityType: 'PAYMENT',
      entityId: manualTxn,
      officeId: firstOcc.id,
      meta: `Recorded manual Cash payment of ETB 18,000`,
    });
  }

  // 11. Seed Audit Log Entries
  for (const entry of auditEntries) {
    await prisma.auditLog.create({
      data: {
        actorName: entry.actorName,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        officeId: entry.officeId,
        meta: entry.meta,
        createdAt: NOW,
      },
    });
  }

  console.log(`✅ Seeded ${auditEntries.length} initial audit entries`);
  console.log('🎉 Enqopa RentPro database successfully seeded with fidelity data!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
