import readline from 'readline';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to parse CLI arguments like --email=... or --email ...
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      if (arg.includes('=')) {
        const [key, val] = arg.slice(2).split('=');
        parsed[key] = val;
      } else if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        parsed[arg.slice(2)] = args[i + 1];
        i++;
      } else {
        parsed[arg.slice(2)] = true;
      }
    }
  }
  return parsed;
}

// Ask question helper with default fallback
function ask(rl, query, defaultValue) {
  return new Promise((resolve) => {
    rl.question(`${query} [${defaultValue}]: `, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

async function createOwner() {
  console.log('\n============================================================');
  console.log('👑  ENQOPA RENTPRO — INITIALIZE OWNER CREDENTIALS');
  console.log('============================================================\n');

  const cliArgs = parseArgs();

  let name = cliArgs.name || process.env.OWNER_NAME;
  let email = cliArgs.email || process.env.OWNER_EMAIL;
  let phone = cliArgs.phone || process.env.OWNER_PHONE;
  let password = cliArgs.password || process.env.OWNER_PASSWORD;

  // If running interactively in terminal and arguments weren't fully passed, prompt user
  const isInteractive = process.stdin.isTTY && (!name || !email || !password);

  if (isInteractive) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      if (!name) name = await ask(rl, 'Full Name', 'Meseret Alemayehu');
      if (!email) email = await ask(rl, 'Owner Email', 'owner@enqoparentpro.et');
      if (!phone) phone = await ask(rl, 'Phone Number', '0911000000');
      if (!password) password = await ask(rl, 'Password', 'admin123');
    } finally {
      rl.close();
    }
  } else {
    // Non-interactive fallback defaults
    name = name || 'Meseret Alemayehu';
    email = email || 'owner@enqoparentpro.et';
    phone = phone || '0911000000';
    password = password || 'admin123';
  }

  const normalizedEmail = email.toLowerCase().trim();
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    let ownerUser;
    if (existingUser) {
      ownerUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name,
          phone,
          passwordHash,
          role: Role.OWNER,
          title: 'Owner',
          isActive: true,
        },
      });
      console.log('🔄 Existing user updated to OWNER role with provided password.');
    } else {
      const newId = 'usr_' + Math.random().toString(36).slice(2, 9);
      ownerUser = await prisma.user.create({
        data: {
          id: newId,
          name,
          email: normalizedEmail,
          phone,
          passwordHash,
          role: Role.OWNER,
          title: 'Owner',
          isActive: true,
        },
      });
      console.log('✨ New Owner user record created in database.');
    }

    // Log this setup event in AuditLog
    try {
      await prisma.auditLog.create({
        data: {
          id: 'aud_' + Math.random().toString(36).slice(2, 9),
          userId: ownerUser.id,
          userName: ownerUser.name,
          userRole: ownerUser.role,
          action: 'OWNER_CREDENTIAL_CONFIGURED',
          entityType: 'User',
          entityId: ownerUser.id,
          details: `Owner account initialized (${normalizedEmail})`,
        },
      });
    } catch {
      // Audit log optional if schema constraints vary
    }

    console.log('\n============================================================');
    console.log('✅  OWNER CREDENTIALS READY');
    console.log('============================================================');
    console.log(`• Full Name : ${ownerUser.name}`);
    console.log(`• Email     : ${ownerUser.email}`);
    console.log(`• Phone     : ${ownerUser.phone}`);
    console.log(`• Password  : ${password}`);
    console.log(`• Role      : ${ownerUser.role} (Executive Portfolio Admin)`);
    console.log(`• Status    : ${ownerUser.isActive ? 'ACTIVE' : 'INACTIVE'}`);
    console.log('============================================================');
    console.log('👉 You can now sign in at: http://localhost:5173/login');
    console.log('============================================================\n');
  } catch (error) {
    console.error('\n❌ Failed to create owner credentials:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createOwner();

