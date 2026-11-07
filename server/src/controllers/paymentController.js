import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const manualPaymentSchema = z.object({
  body: z.object({
    tenantId: z.string().min(1, 'Tenant is required'),
    amount: z.number().positive('Payment amount must be greater than 0'),
    paymentDate: z.string().optional(),
    method: z.enum(['CASH', 'BANK_TRANSFER', 'CHAPA', 'TELEBIRR', 'CBE_BIRR']).default('BANK_TRANSFER'),
    txnRef: z.string().optional(),
    note: z.string().optional(),
    period: z.string().default('September 2026'),
  }),
});

export const rejectPaymentSchema = z.object({
  body: z.object({
    reason: z.string().min(3, 'A reason is required to reject a payment'),
  }),
});

export const getPayments = async (req, res, next) => {
  try {
    const { buildingId, status, search, period } = req.query;
    const where = {};

    // Scoping for manager
    if (!req.user.isOwner && req.user.buildingIds) {
      if (buildingId) {
        if (!req.user.buildingIds.includes(String(buildingId))) {
          return successResponse(res, 'No payments accessible', []);
        }
        where.buildingId = String(buildingId);
      } else {
        where.buildingId = { in: req.user.buildingIds };
      }
    } else if (buildingId && buildingId !== '__all__') {
      where.buildingId = String(buildingId);
    }

    if (period) {
      where.period = String(period);
    }

    // Status filter
    if (status && status !== 'all' && status !== 'overdue') {
      if (status === 'paid' || status === 'APPROVED') {
        where.status = 'APPROVED';
      } else if (status === 'pending' || status === 'PENDING') {
        where.status = 'PENDING';
      } else if (status === 'rejected' || status === 'REJECTED') {
        where.status = 'REJECTED';
      }
    }

    if (search) {
      const q = String(search).trim();
      where.tenant = {
        OR: [
          { fullName: { contains: q } },
          { phone: { contains: q } },
        ],
      };
    }

    // If tenant role, view only their own payments
    if (req.user.role === 'TENANT') {
      if (!req.user.tenantId) {
        return successResponse(res, 'No tenant records linked', []);
      }
      where.tenantId = req.user.tenantId;
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        tenant: true,
        office: true,
        building: true,
        verifiedBy: { select: { id: true, name: true, role: true, title: true } },
      },
      orderBy: [{ submittedAt: 'desc' }, { paymentDate: 'desc' }],
    });

    const formatted = payments.map((p) => {
      let st = 'unpaid';
      if (p.status === 'APPROVED') st = 'paid';
      else if (p.status === 'PENDING') st = 'pending';
      else if (p.status === 'REJECTED') st = 'rejected';

      return {
        id: p.id,
        tenantId: p.tenantId,
        tenantName: p.tenant.fullName,
        tenantPhone: p.tenant.phone,
        officeId: p.officeId,
        officeNumber: p.office.number,
        buildingId: p.buildingId,
        buildingName: p.building.name,
        contractId: p.contractId,
        period: p.period,
        amount: Number(p.amount),
        expected: Number(p.expectedAmount),
        dueDate: p.dueDate,
        paymentDate: p.paymentDate,
        submittedDate: p.submittedAt,
        method: p.method,
        txnRef: p.txnRef || '—',
        status: st,
        dbStatus: p.status,
        manual: p.isManual,
        verifiedBy: p.verifiedBy ? p.verifiedBy.name : (p.verifiedBySystem ? 'Server-verified' : null),
        verifiedByTitle: p.verifiedBy ? p.verifiedBy.title : null,
        rejectionReason: p.rejectionReason,
        note: p.note,
        receiptUrl: p.receiptUrl,
      };
    });

    // Check overdue synthesis if 'all' or 'overdue' is requested for the current cycle
    const now = new Date();
    let result = formatted;

    if (status === 'overdue' || status === 'all') {
      // Find all active contracts that have no APPROVED or PENDING payment for September 2026
      const targetBuildingWhere = {};
      if (!req.user.isOwner && req.user.buildingIds) {
        if (buildingId && buildingId !== '__all__') {
          targetBuildingWhere.buildingId = String(buildingId);
        } else {
          targetBuildingWhere.buildingId = { in: req.user.buildingIds };
        }
      } else if (buildingId && buildingId !== '__all__') {
        targetBuildingWhere.buildingId = String(buildingId);
      }

      const activeContracts = await prisma.contract.findMany({
        where: {
          status: 'ACTIVE',
          office: targetBuildingWhere,
        },
        include: {
          tenant: true,
          office: { include: { building: true } },
          payments: {
            where: { period: 'September 2026' },
          },
        },
      });

      const overdueItems = [];
      activeContracts.forEach((c) => {
        const hasApprovedOrPending = c.payments.some((p) => p.status === 'APPROVED' || p.status === 'PENDING');
        if (!hasApprovedOrPending) {
          // If search filter exists, check match
          if (search) {
            const q = String(search).toLowerCase();
            if (!c.tenant.fullName.toLowerCase().includes(q) && !c.tenant.phone.includes(q)) {
              return;
            }
          }

          const dueDay = c.dueDay || 5;
          const dueDate = new Date('2026-09-05T00:00:00Z');
          const isOverdue = now > dueDate;

          if (isOverdue) {
            // Check if there is already a rejected payment shown in result
            const hasRejected = c.payments.some((p) => p.status === 'REJECTED');
            if (!hasRejected || status === 'overdue') {
              overdueItems.push({
                id: `synthetic_overdue_${c.id}`,
                tenantId: c.tenantId,
                tenantName: c.tenant.fullName,
                tenantPhone: c.tenant.phone,
                officeId: c.officeId,
                officeNumber: c.office.number,
                buildingId: c.office.buildingId,
                buildingName: c.office.building.name,
                contractId: c.id,
                period: 'September 2026',
                amount: Number(c.rent),
                expected: Number(c.rent),
                dueDate: dueDate,
                paymentDate: null,
                submittedDate: null,
                method: '—',
                txnRef: '—',
                status: 'overdue',
                dbStatus: 'PENDING',
                manual: false,
                verifiedBy: null,
                rejectionReason: null,
                note: null,
                receiptUrl: null,
                isSyntheticOverdue: true,
              });
            }
          }
        }
      });

      if (status === 'overdue') {
        result = overdueItems;
      } else {
        result = [...formatted, ...overdueItems];
      }
    }

    const pendingCount = payments.filter((p) => p.status === 'PENDING').length;

    return successResponse(res, 'Payments retrieved', {
      payments: result,
      pendingCount,
      total: result.length,
    });
  } catch (error) {
    next(error);
  }
};

export const recordManualPayment = async (req, res, next) => {
  try {
    const {
      tenantId,
      amount,
      paymentDate,
      method = 'BANK_TRANSFER',
      txnRef,
      note,
      period = 'September 2026',
    } = req.body;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        contracts: {
          where: { status: 'ACTIVE' },
          include: { office: true },
        },
      },
    });

    if (!tenant) {
      return errorResponse(res, 'Tenant not found', 404);
    }

    const contract = tenant.contracts[0];
    if (!contract) {
      return errorResponse(res, 'Tenant has no active contract.', 400);
    }

    const office = contract.office;

    // Check manager access
    if (!req.user.isOwner && req.user.buildingIds && !req.user.buildingIds.includes(office.buildingId)) {
      return errorResponse(res, 'You do not have access to this building.', 403);
    }

    const payDate = paymentDate ? new Date(paymentDate) : new Date();
    const dueDate = new Date('2026-09-05T00:00:00Z');

    const payment = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          contractId: contract.id,
          officeId: office.id,
          buildingId: office.buildingId,
          tenantId: tenant.id,
          period,
          expectedAmount: contract.rent,
          amount: Number(amount),
          dueDate,
          paymentDate: payDate,
          submittedAt: payDate,
          method,
          txnRef: txnRef || '—',
          status: 'APPROVED',
          isManual: true,
          verifiedById: req.user.id,
          note: note || null,
        },
      });

      await tx.auditLog.create({
        data: {
          actorName: req.user.name,
          actorId: req.user.id,
          action: 'RECORD_MANUAL_PAYMENT',
          entityType: 'Payment',
          entityId: p.id,
          officeId: office.id,
          meta: `Recorded manual payment of ETB ${Number(amount).toLocaleString()} for Office ${office.number} (${tenant.fullName})`,
        },
      });

      return p;
    });

    return successResponse(res, 'Manual payment recorded successfully', payment, 201);
  } catch (error) {
    next(error);
  }
};

export const approvePayment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { tenant: true, office: true },
    });

    if (!payment) {
      return errorResponse(res, 'Payment not found', 404);
    }

    if (!req.user.isOwner && req.user.buildingIds && !req.user.buildingIds.includes(payment.buildingId)) {
      return errorResponse(res, 'You do not have access to this property.', 403);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.update({
        where: { id },
        data: {
          status: 'APPROVED',
          verifiedById: req.user.id,
          paymentDate: payment.paymentDate || new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          actorName: req.user.name,
          actorId: req.user.id,
          action: 'APPROVE_PAYMENT',
          entityType: 'Payment',
          entityId: p.id,
          officeId: payment.officeId,
          meta: `Approved payment of ETB ${Number(payment.amount).toLocaleString()} for Office ${payment.office.number} (${payment.tenant.fullName})`,
        },
      });

      return p;
    });

    return successResponse(res, 'Payment approved successfully', updated);
  } catch (error) {
    next(error);
  }
};

export const rejectPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim() === '') {
      return errorResponse(res, 'Rejection reason is required', 400);
    }

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { tenant: true, office: true },
    });

    if (!payment) {
      return errorResponse(res, 'Payment not found', 404);
    }

    if (!req.user.isOwner && req.user.buildingIds && !req.user.buildingIds.includes(payment.buildingId)) {
      return errorResponse(res, 'You do not have access to this property.', 403);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectionReason: reason.trim(),
          verifiedById: req.user.id,
        },
      });

      await tx.auditLog.create({
        data: {
          actorName: req.user.name,
          actorId: req.user.id,
          action: 'REJECT_PAYMENT',
          entityType: 'Payment',
          entityId: p.id,
          officeId: payment.officeId,
          meta: `Rejected payment for Office ${payment.office.number} (${payment.tenant.fullName}) — ${reason.trim()}`,
        },
      });

      return p;
    });

    return successResponse(res, 'Payment rejected', updated);
  } catch (error) {
    next(error);
  }
};

export const submitReceipt = async (req, res, next) => {
  try {
    const {
      amount,
      paymentDate,
      method = 'BANK_TRANSFER',
      txnRef,
      note,
      period = 'September 2026',
    } = req.body;

    let tenantId = req.body.tenantId;
    if (req.user.role === 'TENANT') {
      tenantId = req.user.tenantId;
    }

    if (!tenantId) {
      return errorResponse(res, 'Tenant identifier is required.', 400);
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        contracts: {
          where: { status: 'ACTIVE' },
          include: { office: true },
        },
      },
    });

    if (!tenant) {
      return errorResponse(res, 'Tenant record not found', 404);
    }

    const contract = tenant.contracts[0];
    if (!contract) {
      return errorResponse(res, 'Tenant has no active lease contract', 400);
    }

    const office = contract.office;
    const payDate = paymentDate ? new Date(paymentDate) : new Date();
    const receiptUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const cleanRef = txnRef || 'FT' + Math.floor(100000 + Math.random() * 900000);

    const payment = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          contractId: contract.id,
          officeId: office.id,
          buildingId: office.buildingId,
          tenantId: tenant.id,
          period,
          expectedAmount: contract.rent,
          amount: Number(amount) || Number(contract.rent),
          dueDate: new Date('2026-09-05T00:00:00Z'),
          paymentDate: payDate,
          submittedAt: new Date(),
          method,
          txnRef: cleanRef,
          status: 'PENDING',
          receiptUrl,
          note: note || null,
        },
      });

      await tx.auditLog.create({
        data: {
          actorName: tenant.fullName,
          actorId: req.user.id,
          action: 'SUBMIT_RECEIPT',
          entityType: 'Payment',
          entityId: p.id,
          officeId: office.id,
          meta: `Submitted payment of ETB ${(Number(amount) || Number(contract.rent)).toLocaleString()} for Office ${office.number}`,
        },
      });

      return p;
    });

    return successResponse(res, 'Receipt submitted for verification.', payment, 201);
  } catch (error) {
    next(error);
  }
};
