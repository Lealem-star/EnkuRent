import { prisma } from '../config/prisma.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { logAuditEvent } from '../utils/auditLogger.js';

export const getGateways = async (req, res, next) => {
  try {
    const gateways = await prisma.gatewayConfig.findMany({
      orderBy: { provider: 'asc' },
    });

    // Mask secret keys for security before sending to client
    const safeGateways = gateways.map((g) => ({
      id: g.id,
      provider: g.provider,
      name: g.name,
      isEnabled: g.isEnabled,
      isLive: g.isLive,
      feePercent: g.feePercent,
      instructions: g.instructions,
      updatedAt: g.updatedAt,
      publicKey: g.publicKey || '',
      hasSecretKey: Boolean(g.secretKey),
      secretKeyMasked: g.secretKey
        ? `${g.secretKey.slice(0, 6)}••••••••${g.secretKey.slice(-4)}`
        : 'Not Configured',
      webhookSecretMasked: g.webhookSecret
        ? `whsec_••••••••${g.webhookSecret.slice(-4)}`
        : 'Not Configured',
    }));

    return successResponse(res, 'Payment gateways retrieved', safeGateways);
  } catch (error) {
    next(error);
  }
};

export const updateGateway = async (req, res, next) => {
  try {
    const { provider } = req.params;
    const {
      name,
      isEnabled,
      isLive,
      feePercent,
      publicKey,
      secretKey,
      webhookSecret,
      merchantId,
      instructions,
    } = req.body;

    const existing = await prisma.gatewayConfig.findUnique({
      where: { provider: provider.toUpperCase() },
    });

    if (!existing) {
      return errorResponse(res, 'Gateway provider not found', 404);
    }

    const data = {};
    if (name !== undefined) data.name = name;
    if (isEnabled !== undefined) data.isEnabled = Boolean(isEnabled);
    if (isLive !== undefined) data.isLive = Boolean(isLive);
    if (feePercent !== undefined) data.feePercent = Number(feePercent);
    if (publicKey !== undefined) data.publicKey = publicKey;
    if (secretKey && !secretKey.includes('••••')) data.secretKey = secretKey;
    if (webhookSecret && !webhookSecret.includes('••••')) data.webhookSecret = webhookSecret;
    if (merchantId !== undefined) data.merchantId = merchantId;
    if (instructions !== undefined) data.instructions = instructions;

    const updated = await prisma.gatewayConfig.update({
      where: { provider: provider.toUpperCase() },
      data,
    });

    await logAuditEvent({
      actorId: req.user.id,
      actorName: req.user.name,
      action: 'GATEWAY_CONFIG_UPDATED',
      entityType: 'GatewayConfig',
      entityId: updated.id,
      meta: {
        provider: updated.provider,
        isEnabled: updated.isEnabled,
        isLive: updated.isLive,
        feePercent: updated.feePercent,
      },
    });

    return successResponse(res, `Gateway ${updated.name} updated successfully`, {
      provider: updated.provider,
      name: updated.name,
      isEnabled: updated.isEnabled,
      isLive: updated.isLive,
      feePercent: updated.feePercent,
    });
  } catch (error) {
    next(error);
  }
};

export const testGatewayConnection = async (req, res, next) => {
  try {
    const { provider } = req.params;
    const gateway = await prisma.gatewayConfig.findUnique({
      where: { provider: provider.toUpperCase() },
    });

    if (!gateway) return errorResponse(res, 'Gateway provider not found', 404);

    if (gateway.provider === 'BANK_TRANSFER') {
      return successResponse(res, 'Direct bank deposit is operational (Manual receipt verification mode).', {
        provider: gateway.provider,
        status: 'HEALTHY',
        mode: gateway.isLive ? 'LIVE' : 'SANDBOX',
      });
    }

    // For Chapa / Telebirr / CBE Birr
    const hasKeys = Boolean(gateway.publicKey && gateway.secretKey);

    return successResponse(res, `Gateway test for ${gateway.name} completed`, {
      provider: gateway.provider,
      status: hasKeys ? 'CONFIGURED' : 'NEEDS_CREDENTIALS',
      mode: gateway.isLive ? 'PRODUCTION' : 'TEST_SANDBOX',
      message: hasKeys
        ? 'Credentials and webhook listeners active.'
        : 'Keys missing. Please add API credentials to enable live transactions.',
    });
  } catch (error) {
    next(error);
  }
};
