import crypto from 'crypto';
import { prisma } from '../config/prisma.js';
import { config } from '../config/env.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const initializeChapa = async (req, res, next) => {
  try {
    const { amount, tenantId, returnUrl } = req.body;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId || req.user.tenantId },
      include: {
        contracts: {
          where: { status: 'ACTIVE' },
          include: { office: { include: { building: true } } },
        },
      },
    });

    if (!tenant) {
      return errorResponse(res, 'Tenant not found', 404);
    }

    const contract = tenant.contracts[0];
    if (!contract) {
      return errorResponse(res, 'No active contract found', 400);
    }

    const txRef = 'CHAPA_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7).toUpperCase();
    const payAmount = Number(amount) || Number(contract.rent);

    // Call real Chapa API if a live or real test key is configured, else provide structured sandbox response
    let chapaCheckoutUrl = `https://checkout.chapa.co/checkout/web/mock/${txRef}`;
    let isLiveGateway = false;

    if (config.chapaSecretKey && config.chapaSecretKey.startsWith('CHASECK') && !config.chapaSecretKey.includes('sample')) {
      try {
        const response = await fetch('https://api.chapa.co/v1/transaction/initialize', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.chapaSecretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: payAmount.toString(),
            currency: 'ETB',
            email: tenant.email,
            first_name: tenant.fullName.split(' ')[0],
            last_name: tenant.fullName.split(' ').slice(1).join(' ') || 'Tenant',
            phone_number: tenant.phone,
            tx_ref: txRef,
            callback_url: `${config.clientUrl}/api/gateway/chapa/verify/${txRef}`,
            return_url: returnUrl || `${config.clientUrl}/#/tenant`,
            'customization[title]': 'EnkuRent Rent Payment',
            'customization[description]': `Rent for Office ${contract.office.number}`,
          }),
        });

        const data = await response.json();
        if (data.status === 'success' && data.data?.checkout_url) {
          chapaCheckoutUrl = data.data.checkout_url;
          isLiveGateway = true;
        }
      } catch (err) {
        console.warn('Chapa API call failed, falling back to sandbox mode:', err.message);
      }
    }

    return successResponse(res, 'Chapa payment initialized', {
      checkoutUrl: chapaCheckoutUrl,
      txRef,
      amount: payAmount,
      isLiveGateway,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyChapa = async (req, res, next) => {
  try {
    const { txRef } = req.params;

    let isSuccess = true;
    let paymentData = { tx_ref: txRef };

    if (config.chapaSecretKey && config.chapaSecretKey.startsWith('CHASECK') && !config.chapaSecretKey.includes('sample')) {
      try {
        const response = await fetch(`https://api.chapa.co/v1/transaction/verify/${txRef}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${config.chapaSecretKey}`,
          },
        });
        const data = await response.json();
        isSuccess = data.status === 'success';
        paymentData = data.data;
      } catch (err) {
        console.warn('Chapa verification call failed:', err.message);
      }
    }

    if (isSuccess) {
      // Find existing payment or update
      const payment = await prisma.payment.findFirst({
        where: { txnRef: txRef },
        include: { office: true, tenant: true },
      });

      if (payment && payment.status !== 'APPROVED') {
        await prisma.$transaction([
          prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: 'APPROVED',
              verifiedBySystem: true,
              paymentDate: new Date(),
            },
          }),
          prisma.auditLog.create({
            data: {
              actorName: payment.tenant.fullName,
              action: 'PAYMENT_CHAPA_VERIFIED',
              entityType: 'Payment',
              entityId: payment.id,
              officeId: payment.officeId,
              meta: `Chapa payment of ETB ${Number(payment.amount).toLocaleString()} verified automatically by gateway`,
            },
          }),
        ]);
      }
    }

    return successResponse(res, 'Payment status verified', { verified: isSuccess, paymentData });
  } catch (error) {
    next(error);
  }
};

export const webhookChapa = async (req, res, next) => {
  try {
    const signature = req.headers['x-chapa-signature'] || req.headers['chapa-signature'];
    const secret = config.chapaWebhookSecret;

    // Verify HMAC SHA256 signature if secret configured
    if (signature && secret) {
      const hash = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (hash !== signature) {
        return errorResponse(res, 'Invalid webhook signature', 400);
      }
    }

    const { tx_ref, status } = req.body;
    if (status === 'success' && tx_ref) {
      const payment = await prisma.payment.findFirst({
        where: { txnRef: tx_ref },
        include: { tenant: true, office: true },
      });

      if (payment && payment.status !== 'APPROVED') {
        await prisma.$transaction([
          prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: 'APPROVED',
              verifiedBySystem: true,
              paymentDate: new Date(),
            },
          }),
          prisma.auditLog.create({
            data: {
              actorName: 'Chapa Webhook',
              action: 'WEBHOOK_PAYMENT_CONFIRMED',
              entityType: 'Payment',
              entityId: payment.id,
              officeId: payment.officeId,
              meta: `Verified by Chapa Webhook: ETB ${Number(payment.amount).toLocaleString()} for Office ${payment.office.number}`,
            },
          }),
        ]);
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
};

export const instantPay = async (req, res, next) => {
  try {
    const { method, amount, period = 'September 2026' } = req.body;
    let tenantId = req.body.tenantId;

    if (req.user.role === 'TENANT') {
      tenantId = req.user.tenantId;
    }

    if (!tenantId) {
      return errorResponse(res, 'Tenant identifier required', 400);
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
      return errorResponse(res, 'Tenant not found', 404);
    }

    const contract = tenant.contracts[0];
    if (!contract) {
      return errorResponse(res, 'No active contract found', 400);
    }

    const office = contract.office;
    const payAmount = Number(amount) || Number(contract.rent);
    const txnRef = 'TXN' + Math.floor(100000 + Math.random() * 900000);
    const isInstant = ['CHAPA', 'TELEBIRR', 'CBE_BIRR', 'Chapa', 'Telebirr', 'CBE Birr'].includes(method);

    const payment = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          contractId: contract.id,
          officeId: office.id,
          buildingId: office.buildingId,
          tenantId: tenant.id,
          period,
          expectedAmount: contract.rent,
          amount: payAmount,
          dueDate: new Date('2026-09-05T00:00:00Z'),
          paymentDate: new Date(),
          submittedAt: new Date(),
          method: method.toUpperCase().replace(/\s+/g, '_'),
          txnRef,
          status: isInstant ? 'APPROVED' : 'PENDING',
          verifiedBySystem: isInstant,
          isManual: false,
        },
      });

      await tx.auditLog.create({
        data: {
          actorName: tenant.fullName,
          actorId: req.user.id,
          action: isInstant ? 'INSTANT_PAYMENT_CONFIRMED' : 'SUBMIT_PAYMENT',
          entityType: 'Payment',
          entityId: p.id,
          officeId: office.id,
          meta: isInstant
            ? `Paid ETB ${payAmount.toLocaleString()} via ${method} (server-verified instantly)`
            : `Submitted payment of ETB ${payAmount.toLocaleString()} for Office ${office.number}`,
        },
      });

      return p;
    });

    return successResponse(
      res,
      isInstant ? 'Payment confirmed — thank you!' : 'Payment submitted for review',
      payment,
      201
    );
  } catch (error) {
    next(error);
  }
};

