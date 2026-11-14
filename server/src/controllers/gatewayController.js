import crypto from 'crypto';
import { prisma } from '../config/prisma.js';
import { config } from '../config/env.js';
import { successResponse, errorResponse } from '../utils/response.js';

/**
 * 7.1 Initialize Chapa Payment
 * Calculates and validates amount on the backend.
 * Pre-creates a PENDING payment attempt before contacting Chapa.
 */
export const initializeChapa = async (req, res, next) => {
  try {
    const { returnUrl, period = 'September 2026' } = req.body;

    let targetTenantId = req.body.tenantId;
    if (req.user.role === 'TENANT') {
      targetTenantId = req.user.tenantId;
    }

    if (!targetTenantId) {
      return errorResponse(res, 'Tenant identifier is required.', 400);
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: targetTenantId },
      include: {
        contracts: {
          where: { status: 'ACTIVE' },
          include: { office: { include: { building: true } } },
        },
      },
    });

    if (!tenant) {
      return errorResponse(res, 'Tenant record not found.', 404);
    }

    // Multi-tenant check
    if (!req.user.isSuperAdmin) {
      if (req.user.role === 'TENANT') {
        if (tenant.id !== req.user.tenantId && tenant.userId !== req.user.id) {
          return errorResponse(res, 'Access denied: You can only pay for your own lease.', 403);
        }
      } else if (req.user.role === 'OWNER') {
        const ownsTenantOffice = tenant.contracts.some((c) => c.office?.building?.ownerId === req.user.id);
        if (!ownsTenantOffice) {
          return errorResponse(res, 'Access denied: You do not own this tenant property.', 403);
        }
      }
    }

    const activeContract = tenant.contracts[0];
    if (!activeContract) {
      return errorResponse(res, 'No active lease contract found for this tenant.', 400);
    }

    // Amount strictly calculated and validated by backend (never trusting frontend amount)
    const rentAmount = Number(activeContract.rent);
    if (!rentAmount || rentAmount <= 0) {
      return errorResponse(res, 'Invalid contract rental amount.', 400);
    }

    const txRef = 'CHAPA_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8).toUpperCase();
    const office = activeContract.office;
    const building = office.building;
    const dueDate = new Date('2026-09-05T00:00:00Z');

    // 1. Pre-create PENDING payment attempt in DB before contacting provider
    const pendingPayment = await prisma.payment.create({
      data: {
        contractId: activeContract.id,
        officeId: office.id,
        buildingId: building.id,
        tenantId: tenant.id,
        period,
        expectedAmount: rentAmount,
        amount: rentAmount,
        dueDate,
        submittedAt: new Date(),
        method: 'CHAPA',
        txnRef: txRef,
        status: 'PENDING',
        verifiedBySystem: false,
        isManual: false,
        note: `Chapa Hosted Checkout attempt initialized for Office ${office.number}`,
      },
    });

    // 2. Contact Chapa API
    const chapaSecretKey = config.chapaSecretKey;
    const clientUrl = config.clientUrl || 'http://localhost:5173';
    const callbackUrl = `${clientUrl}/api/gateway/chapa/webhook`;
    const resolvedReturnUrl = returnUrl || `${clientUrl}/#/tenant?payment_ref=${txRef}`;

    let checkoutUrl = null;
    let isLiveGateway = false;

    if (!chapaSecretKey || !chapaSecretKey.startsWith('CHASECK') || chapaSecretKey.includes('sample')) {
      // In development / demo when no live Chapa key is provided, return controlled offline response
      // Roll back the pending payment so no misleading record is stored
      await prisma.payment.delete({ where: { id: pendingPayment.id } }).catch(() => {});
      return errorResponse(
        res,
        'Chapa payment gateway is not configured with a valid secret key. Please configure CHAPA_SECRET_KEY in server environment.',
        503
      );
    }

    // Official Chapa Hosted Checkout API (v1 transaction initialize)
    try {
      const chapaResponse = await fetch('https://api.chapa.co/v1/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${chapaSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: rentAmount.toString(),
          currency: 'ETB',
          email: tenant.email,
          first_name: tenant.fullName.split(' ')[0] || 'Tenant',
          last_name: tenant.fullName.split(' ').slice(1).join(' ') || 'Customer',
          phone_number: tenant.phone,
          tx_ref: txRef,
          callback_url: callbackUrl,
          return_url: resolvedReturnUrl,
          'customization[title]': 'Enqopa RentPro — Rent Payment',
          'customization[description]': `Rent for Office ${office.number} (${building.name})`,
        }),
      });

      const chapaData = await chapaResponse.json();
      if (chapaData.status === 'success' && chapaData.data?.checkout_url) {
        checkoutUrl = chapaData.data.checkout_url;
        isLiveGateway = true;
      } else {
        // Roll back pending payment if initialization was rejected by Chapa
        await prisma.payment.delete({ where: { id: pendingPayment.id } }).catch(() => {});
        const msg = typeof chapaData.message === 'object' ? JSON.stringify(chapaData.message) : (chapaData.message || 'Payment provider error');
        return errorResponse(res, `Chapa initialization failed: ${msg}`, 502);
      }
    } catch (chapaErr) {
      // Network failure reaching Chapa: safely clean up pending record
      await prisma.payment.delete({ where: { id: pendingPayment.id } }).catch(() => {});
      return errorResponse(res, `Chapa gateway network error: ${chapaErr.message}`, 502);
    }

    return successResponse(
      res,
      'Chapa hosted payment initialized successfully',
      {
        paymentId: pendingPayment.id,
        checkoutUrl,
        txRef,
        amount: rentAmount,
        currency: 'ETB',
        isLiveGateway,
      },
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * 7.3 Verify Chapa Payment
 * Strictly verifies provider response before approving.
 * Fails safely if keys are missing; never defaults to success.
 */
export const verifyChapa = async (req, res, next) => {
  try {
    const { txRef } = req.params;

    if (!txRef) {
      return errorResponse(res, 'Transaction reference is required.', 400);
    }

    const payment = await prisma.payment.findFirst({
      where: { txnRef: txRef },
      include: { office: true, tenant: true, building: true },
    });

    if (!payment) {
      return errorResponse(res, 'Payment transaction record not found.', 404);
    }

    // Idempotency: If already approved, return success without double processing
    if (payment.status === 'APPROVED') {
      return successResponse(res, 'Payment is already verified and approved.', {
        verified: true,
        alreadyProcessed: true,
        payment,
      });
    }

    const chapaSecretKey = config.chapaSecretKey;
    if (!chapaSecretKey || !chapaSecretKey.startsWith('CHASECK') || chapaSecretKey.includes('sample')) {
      return errorResponse(
        res,
        'Cannot verify payment: Live Chapa gateway credentials are not configured.',
        503
      );
    }

    let isSuccess = false;
    let verifiedAmount = null;
    let verifiedCurrency = null;
    let providerPayload = null;

    // Official Chapa Transaction Verification API (v1)
    try {
      const v1Res = await fetch(`https://api.chapa.co/v1/transaction/verify/${txRef}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${chapaSecretKey}` },
      });
      const v1Data = await v1Res.json();
      if (
        v1Data.status === 'success' &&
        v1Data.data &&
        (v1Data.data.status === 'success' || v1Data.data.status === 'paid')
      ) {
        isSuccess = true;
        verifiedAmount = Number(v1Data.data.amount);
        verifiedCurrency = v1Data.data.currency;
        providerPayload = v1Data.data;
      } else if (v1Data.data && v1Data.data.status === 'pending') {
        return errorResponse(
          res,
          'Payment is currently pending at Chapa. Customer has not completed checkout yet.',
          400
        );
      }
    } catch (err) {
      console.error('[Chapa Verify] Verification network call failed:', err.message);
      return errorResponse(res, `Failed to reach Chapa verification API: ${err.message}`, 502);
    }

    if (!isSuccess) {
      return errorResponse(
        res,
        'Payment could not be verified by Chapa. Transaction is not marked as successful by the provider.',
        400
      );
    }

    // Strict Amount and Currency Verification
    if (verifiedCurrency && verifiedCurrency !== 'ETB') {
      return errorResponse(res, `Payment rejected: Invalid currency ${verifiedCurrency}. Expected ETB.`, 400);
    }

    if (verifiedAmount && Math.abs(verifiedAmount - Number(payment.amount)) > 0.01) {
      return errorResponse(
        res,
        `Payment rejected: Amount mismatch. Paid ETB ${verifiedAmount}, expected ETB ${Number(payment.amount)}.`,
        400
      );
    }

    // Atomic Database Update with Concurrency Protection
    const updated = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.payment.updateMany({
        where: { id: payment.id, status: 'PENDING' },
        data: {
          status: 'APPROVED',
          verifiedBySystem: true,
          paymentDate: new Date(),
        },
      });

      if (updateResult.count === 0) {
        // Concurrently settled
        return await tx.payment.findUnique({ where: { id: payment.id } });
      }

      await tx.auditLog.create({
        data: {
          actorName: 'Chapa Gateway',
          actorId: req.user?.id || payment.tenant?.userId || 'SYSTEM',
          action: 'PAYMENT_CHAPA_VERIFIED',
          entityType: 'Payment',
          entityId: payment.id,
          officeId: payment.officeId,
          meta: `Chapa verified ETB ${Number(payment.amount).toLocaleString()} for Office ${payment.office.number} (Ref: ${txRef})`,
        },
      });

      return await tx.payment.findUnique({ where: { id: payment.id } });
    }, { maxWait: 15000, timeout: 30000 });

    return successResponse(res, 'Payment verified and approved successfully.', {
      verified: true,
      payment: updated,
      providerData: providerPayload,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 7.4 Cryptographic Chapa Webhook
 * Raw request body preservation + constant-time HMAC-SHA256 signature comparison.
 * Idempotent processing.
 */
export const webhookChapa = async (req, res, next) => {
  try {
    const signature = req.headers['x-chapa-signature'] || req.headers['chapa-signature'];
    const secret = config.chapaWebhookSecret;

    if (!secret) {
      console.warn('[Webhook Warning] CHAPA_WEBHOOK_SECRET is not configured.');
      return errorResponse(res, 'Webhook configuration error.', 500);
    }

    if (!signature) {
      return errorResponse(res, 'Missing webhook signature.', 401);
    }

    // Use preserved raw body if available, else stringify
    const rawPayload = req.rawBody ? req.rawBody : Buffer.from(JSON.stringify(req.body));
    const computedHash = crypto.createHmac('sha256', secret).update(rawPayload).digest('hex');

    // Constant-time comparison to prevent timing attacks
    const signatureBuf = Buffer.from(signature, 'utf8');
    const hashBuf = Buffer.from(computedHash, 'utf8');

    if (signatureBuf.length !== hashBuf.length || !crypto.timingSafeEqual(signatureBuf, hashBuf)) {
      return errorResponse(res, 'Invalid cryptographic webhook signature.', 400);
    }

    const { tx_ref, status, amount, currency } = req.body;
    if (!tx_ref) {
      return errorResponse(res, 'Missing tx_ref in webhook payload.', 400);
    }

    const payment = await prisma.payment.findFirst({
      where: { txnRef: tx_ref },
      include: { office: true, tenant: true },
    });

    if (!payment) {
      return errorResponse(res, `Payment transaction not found for reference ${tx_ref}.`, 404);
    }

    if (status === 'success') {
      // Idempotency: If already approved, return success without duplicate accounting
      if (payment.status === 'APPROVED') {
        return res.status(200).json({ received: true, alreadyProcessed: true });
      }

      // Currency check
      if (currency && String(currency).toUpperCase() !== 'ETB') {
        return errorResponse(res, `Payment rejected: Invalid currency ${currency}. Expected ETB.`, 400);
      }

      // Amount check
      if (amount !== undefined && amount !== null && Math.abs(Number(amount) - Number(payment.amount)) > 0.01) {
        return errorResponse(
          res,
          `Payment rejected: Amount mismatch. Webhook reported ETB ${amount}, expected ETB ${Number(payment.amount)}.`,
          400
        );
      }

      if (payment.status === 'PENDING') {
        await prisma.$transaction([
          prisma.payment.updateMany({
            where: { id: payment.id, status: 'PENDING' },
            data: {
              status: 'APPROVED',
              verifiedBySystem: true,
              paymentDate: new Date(),
            },
          }),
          prisma.auditLog.create({
            data: {
              actorName: 'Chapa Webhook Engine',
              action: 'WEBHOOK_PAYMENT_CONFIRMED',
              entityType: 'Payment',
              entityId: payment.id,
              officeId: payment.officeId,
              meta: `Confirmed by Chapa Webhook: ETB ${Number(payment.amount).toLocaleString()} for Office ${payment.office.number} (Ref: ${tx_ref})`,
            },
          }),
        ]);
      }
    } else if (status === 'failed' || status === 'cancelled') {
      // Prevent downgrade of already approved payment
      if (payment.status === 'APPROVED') {
        return res.status(200).json({ received: true, ignored: 'Payment is already approved; cannot downgrade.' });
      }

      if (payment.status === 'PENDING') {
        await prisma.$transaction([
          prisma.payment.updateMany({
            where: { id: payment.id, status: 'PENDING' },
            data: {
              status: 'REJECTED',
              rejectionReason: `Payment failed on Chapa gateway (Status: ${status})`,
            },
          }),
          prisma.auditLog.create({
            data: {
              actorName: 'Chapa Webhook Engine',
              action: 'WEBHOOK_PAYMENT_FAILED',
              entityType: 'Payment',
              entityId: payment.id,
              officeId: payment.officeId,
              meta: `Payment failed on Chapa gateway: Status ${status} (Ref: ${tx_ref})`,
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

/**
 * 8. Manual / Unintegrated Payments
 * Removes fake automatic approvals.
 * All manual submissions (Bank transfer, Telebirr slip, CBE Birr slip) are created as PENDING.
 * Chapa payments MUST use /chapa/initialize.
 */
export const instantPay = async (req, res, next) => {
  try {
    const { method, amount, period = 'September 2026', txnRef: clientRef, note } = req.body;
    let targetTenantId = req.body.tenantId;

    if (req.user.role === 'TENANT') {
      targetTenantId = req.user.tenantId;
    }

    if (!targetTenantId) {
      return errorResponse(res, 'Tenant identifier is required.', 400);
    }

    const normalizedMethod = String(method || '').toUpperCase().replace(/\s+/g, '_');

    // Chapa must not be processed via instant-pay; it must use hosted checkout
    if (normalizedMethod === 'CHAPA') {
      return errorResponse(
        res,
        'Chapa payments must be initiated via /api/gateway/chapa/initialize for secure hosted checkout.',
        400
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: targetTenantId },
      include: {
        contracts: {
          where: { status: 'ACTIVE' },
          include: { office: { include: { building: true } } },
        },
      },
    });

    if (!tenant) {
      return errorResponse(res, 'Tenant record not found.', 404);
    }

    const activeContract = tenant.contracts[0];
    if (!activeContract) {
      return errorResponse(res, 'Tenant has no active lease contract.', 400);
    }

    const office = activeContract.office;
    const building = office.building;

    // Strict multi-tenant verification
    if (!req.user.isSuperAdmin) {
      if (req.user.role === 'TENANT') {
        if (tenant.id !== req.user.tenantId && tenant.userId !== req.user.id) {
          return errorResponse(res, 'Access denied.', 403);
        }
      } else if (req.user.role === 'OWNER') {
        if (building.ownerId !== req.user.id) {
          return errorResponse(res, 'Access denied: You do not own this property.', 403);
        }
      }
    }

    const rentAmount = Number(amount) || Number(activeContract.rent);
    const generatedRef = clientRef || (normalizedMethod.slice(0, 4) + '_' + Math.floor(100000 + Math.random() * 900000));
    const dueDate = new Date('2026-09-05T00:00:00Z');

    // CRITICAL FIX: ALL manual and unintegrated payment submissions are created as PENDING.
    // They are NEVER automatically approved without verified bank settlement.
    const payment = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          contractId: activeContract.id,
          officeId: office.id,
          buildingId: building.id,
          tenantId: tenant.id,
          period,
          expectedAmount: activeContract.rent,
          amount: rentAmount,
          dueDate,
          submittedAt: new Date(),
          method: normalizedMethod,
          txnRef: generatedRef,
          status: 'PENDING',
          verifiedBySystem: false,
          isManual: true,
          note: note || `Submitted via ${method} (awaiting accountant verification)`,
        },
      });

      await tx.auditLog.create({
        data: {
          actorName: tenant.fullName,
          actorId: req.user.id,
          action: 'SUBMIT_MANUAL_PAYMENT',
          entityType: 'Payment',
          entityId: p.id,
          officeId: office.id,
          meta: `Submitted ${method} payment of ETB ${rentAmount.toLocaleString()} for Office ${office.number} (Pending Review)`,
        },
      });

      return p;
    }, { maxWait: 15000, timeout: 30000 });

    return successResponse(
      res,
      `Payment submitted successfully via ${method}. Status is PENDING verification by your property accountant.`,
      payment,
      201
    );
  } catch (error) {
    next(error);
  }
};
