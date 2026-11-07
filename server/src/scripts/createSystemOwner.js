import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';

async function main() {
  const email = process.env.SYSTEM_OWNER_EMAIL || 'admin@enkurent.et';
  const password = process.env.SYSTEM_OWNER_PASSWORD || 'SuperAdminPassword123!';
  const name = process.env.SYSTEM_OWNER_NAME || 'EnkuRent System Owner';
  const phone = process.env.SYSTEM_OWNER_PHONE || '+251911000001';

  console.log(`Checking system owner account (${email})...`);

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: 'SUPER_ADMIN',
        approvalStatus: 'APPROVED',
        isActive: true,
        passwordHash,
        name,
        phone,
      },
    });
    console.log(`System owner account updated successfully: ${updated.email}`);
  } else {
    const created = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        passwordHash,
        role: 'SUPER_ADMIN',
        title: 'Platform System Administrator',
        approvalStatus: 'APPROVED',
        isActive: true,
      },
    });
    console.log(`System owner account created successfully: ${created.email}`);
  }

  // Also verify if a sample pending owner exists for testing the approval workflow
  const pendingOwnerEmail = 'kassahun@bekele.et';
  const existingPending = await prisma.user.findUnique({
    where: { email: pendingOwnerEmail },
  });

  if (!existingPending) {
    const sampleHash = await bcrypt.hash('Password123!', salt);
    await prisma.user.create({
      data: {
        name: 'Kassahun Bekele',
        email: pendingOwnerEmail,
        phone: '+251911223344',
        companyName: 'Bekele Commercial Towers PLC',
        notes: 'Commercial properties in Bole and Mexico Square. Requesting platform onboarding for 2 plazas (64 offices).',
        passwordHash: sampleHash,
        role: 'OWNER',
        title: 'Property Owner',
        approvalStatus: 'PENDING',
        isActive: false,
      },
    });
    console.log(`Sample pending building owner created: ${pendingOwnerEmail}`);
  }

  console.log('System owner setup complete!');
}

main()
  .catch((err) => {
    console.error('Failed to create/update system owner:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

