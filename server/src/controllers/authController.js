import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { generateToken } from '../utils/jwt.js';
import { successResponse, errorResponse } from '../utils/response.js';

// In-memory OTP store for development/demo (stub SMS service)
const otpStore = new Map();

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    password: z.string().optional(),
    role: z.enum(['owner', 'manager', 'tenant']).optional(),
  }),
});

export const requestOtpSchema = z.object({
  body: z.object({
    phone: z.string().min(9, 'Valid Ethiopian phone number required (e.g. 0911234567)'),
  }),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    phone: z.string().min(9),
    otp: z.string().length(6, '6-digit OTP code required'),
  }),
});

export const registerOwnerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Full name is required'),
    email: z.string().email('Valid email address is required'),
    phone: z.string().min(9, 'Valid phone number is required'),
    companyName: z.string().min(2, 'Company or portfolio name is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    notes: z.string().optional(),
  }),
});

export const registerOwner = async (req, res, next) => {
  try {
    const { name, email, phone, companyName, password, notes } = req.body;

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { phone },
        ],
      },
    });

    if (existingUser) {
      return errorResponse(res, 'An account with this email or phone number already exists.', 400);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newOwner = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        phone,
        companyName,
        passwordHash,
        role: 'OWNER',
        title: 'Building Owner',
        notes: notes || '',
        approvalStatus: 'PENDING',
        isActive: false, // Inactive until approved by SUPER_ADMIN
      },
    });

    return successResponse(
      res,
      'Registration submitted successfully! Your Building Owner account is pending review by our System Administrator.',
      {
        id: newOwner.id,
        name: newOwner.name,
        email: newOwner.email,
        companyName: newOwner.companyName,
        approvalStatus: newOwner.approvalStatus,
      },
      201
    );
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, phone, password, role } = req.body;

    // Quick demo role login if role is provided
    if (role) {
      let targetEmail = 'owner@enkurent.et';
      if (role === 'manager' || role === 'accountant') {
        targetEmail = 'selam.fikru@enkurent.et';
      } else if (role === 'tenant') {
        const firstTenant = await prisma.user.findFirst({
          where: { role: 'TENANT' },
        });
        if (firstTenant) targetEmail = firstTenant.email;
      }

      const demoUser = await prisma.user.findUnique({
        where: { email: targetEmail },
        include: {
          buildings: { select: { buildingId: true } },
          tenantProfile: {
            include: {
              contracts: {
                where: { status: 'ACTIVE' },
                include: { office: { include: { building: true } } },
              },
            },
          },
        },
      });

      if (demoUser) {
        const token = generateToken({ userId: demoUser.id, role: demoUser.role });
        return successResponse(res, 'Demo sign in successful', {
          token,
          user: {
            id: demoUser.id,
            name: demoUser.name,
            email: demoUser.email,
            phone: demoUser.phone,
            role: demoUser.role,
            title: demoUser.title,
            buildingIds: demoUser.role === 'OWNER' ? null : demoUser.buildings.map((b) => b.buildingId),
            tenant: demoUser.tenantProfile || null,
          },
        });
      }
    }

    if (!email && !phone) {
      return errorResponse(res, 'Email or phone is required', 400);
    }

    const where = email ? { email: email.toLowerCase() } : { phone };
    const user = await prisma.user.findFirst({
      where,
      include: {
        buildings: { select: { buildingId: true } },
        tenantProfile: {
          include: {
            contracts: {
              where: { status: 'ACTIVE' },
              include: { office: { include: { building: true } } },
            },
          },
        },
      },
    });

    if (!user) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    if (user.approvalStatus === 'PENDING') {
      return errorResponse(
        res,
        'Your Building Owner registration is currently pending review by our System Administrator. You will be activated once approved.',
        403
      );
    }

    if (user.approvalStatus === 'REJECTED') {
      return errorResponse(
        res,
        `Your application was not approved. ${user.notes ? `Reason: ${user.notes}` : 'Please contact support@enkurent.et for inquiries.'}`,
        403
      );
    }

    if (!user.isActive) {
      return errorResponse(res, 'Account is deactivated. Contact administration.', 403);
    }

    if (password) {
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return errorResponse(res, 'Invalid credentials', 401);
      }
    }

    const token = generateToken({ userId: user.id, role: user.role });

    return successResponse(res, 'Sign in successful', {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        title: user.title,
        companyName: user.companyName,
        approvalStatus: user.approvalStatus,
        buildingIds: (user.role === 'OWNER' || user.role === 'SUPER_ADMIN') ? null : user.buildings.map((b) => b.buildingId),
        tenant: user.tenantProfile || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        buildings: {
          include: {
            building: true,
          },
        },
        tenantProfile: {
          include: {
            contracts: {
              where: { status: 'ACTIVE' },
              include: {
                office: {
                  include: {
                    building: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, 'Current session retrieved', {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      title: user.title,
      companyName: user.companyName,
      approvalStatus: user.approvalStatus,
      buildingIds: (user.role === 'OWNER' || user.role === 'SUPER_ADMIN') ? null : user.buildings.map((b) => b.buildingId),
      buildings: user.buildings.map((b) => b.building),
      tenant: user.tenantProfile || null,
    });
  } catch (error) {
    next(error);
  }
};

export const requestOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;

    const tenant = await prisma.tenant.findFirst({
      where: { phone },
      include: { user: true },
    });

    if (!tenant) {
      return errorResponse(res, 'No tenant found with this phone number.', 404);
    }

    // Generate 6-digit OTP (e.g. 123456 in dev or random)
    const otp = process.env.NODE_ENV === 'development' ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(phone, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });

    console.log(`📱 [SMS Gateway Stub] Sent verification OTP '${otp}' to phone ${phone} for ${tenant.fullName}`);

    return successResponse(res, 'OTP verification code sent to your phone.', {
      phone,
      devOtpHint: process.env.NODE_ENV === 'development' ? otp : undefined,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyOtp = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    const record = otpStore.get(phone);

    if (!record || record.otp !== otp || Date.now() > record.expiresAt) {
      return errorResponse(res, 'Invalid or expired OTP code.', 400);
    }

    otpStore.delete(phone);

    const tenant = await prisma.tenant.findFirst({
      where: { phone },
      include: {
        user: true,
        contracts: {
          where: { status: 'ACTIVE' },
          include: { office: { include: { building: true } } },
        },
      },
    });

    if (!tenant) {
      return errorResponse(res, 'Tenant account not found.', 404);
    }

    let user = tenant.user;
    if (!user) {
      // Auto-link a user record if none was attached
      const defaultPassword = await bcrypt.hash('password123', 10);
      user = await prisma.user.create({
        data: {
          name: tenant.fullName,
          email: tenant.email,
          phone: tenant.phone,
          passwordHash: defaultPassword,
          role: 'TENANT',
          title: 'Tenant',
        },
      });
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { userId: user.id },
      });
    }

    const token = generateToken({ userId: user.id, role: user.role });

    return successResponse(res, 'Tenant sign in verified via OTP', {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        title: user.title,
        tenant: {
          id: tenant.id,
          fullName: tenant.fullName,
          phone: tenant.phone,
          email: tenant.email,
          contracts: tenant.contracts,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const resolvePortalOffice = async (req, res, next) => {
  try {
    const { officeId } = req.params;

    const office = await prisma.office.findUnique({
      where: { id: officeId },
      include: {
        building: true,
        contracts: {
          where: { status: 'ACTIVE' },
          include: { tenant: true },
        },
      },
    });

    if (!office) {
      return errorResponse(res, 'Office portal link invalid or not found', 404);
    }

    const activeContract = office.contracts[0] || null;
    const tenant = activeContract?.tenant || null;

    return successResponse(res, 'Portal office resolved', {
      office: {
        id: office.id,
        number: office.number,
        floor: office.floor,
        buildingName: office.building.name,
        buildingAddress: office.building.address,
      },
      tenant: tenant ? { id: tenant.id, fullName: tenant.fullName, phone: tenant.phone } : null,
    });
  } catch (error) {
    next(error);
  }
};
