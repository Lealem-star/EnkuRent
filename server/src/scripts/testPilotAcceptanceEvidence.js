/**
 * Enqopa RentPro — Final Pilot Acceptance Evidence Suite
 * Enqopa Technologies PLC
 * Independent Evidence Verification for Pre-Pilot Deployment
 */

import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });
import { prisma } from '../config/prisma.js';

const API_BASE = 'http://localhost:5000/api';

async function api(path, { method = 'GET', body, token, headers = {} } = {}) {
  const reqHeaders = { 'Content-Type': 'application/json', ...headers };
  if (token) reqHeaders['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    data = await res.text();
  }

  return { status: res.status, data, headers: res.headers };
}

const evidenceResults = [];

function recordEvidence(testNum, title, passed, details, dbBefore, dbAfter) {
  evidenceResults.push({
    testNum,
    title,
    passed,
    details,
    dbBefore: dbBefore ? JSON.stringify(dbBefore) : 'N/A',
    dbAfter: dbAfter ? JSON.stringify(dbAfter) : 'N/A',
  });
  const mark = passed ? '✅ [VERIFIED]' : '❌ [FAILED]';
  console.log(`  ${mark} Case ${testNum}: ${title}`);
  console.log(`     Details: ${details}`);
  if (dbBefore) console.log(`     DB Before: ${JSON.stringify(dbBefore)}`);
  if (dbAfter) console.log(`     DB After:  ${JSON.stringify(dbAfter)}`);
  console.log('');
}

async function runPilotAcceptanceTests() {
  console.log('========================================================================');
  console.log('   ENQOPA RENTPRO — FINAL PILOT ACCEPTANCE EVIDENCE SUITE              ');
  console.log('   Enqopa Technologies PLC — Independent Verification                   ');
  console.log('========================================================================\n');

  // -------------------------------------------------------------------------
  // SETUP PERSONAS
  // -------------------------------------------------------------------------
  console.log('[Setup] Authenticating test personas...');
  const adminLogin = await api('/auth/login', {
    method: 'POST',
    body: { email: 'admin@enqoparentpro.et', password: 'SuperAdminPassword123!' },
  });
  const adminToken = adminLogin.data?.data?.token;

  const ownerLogin = await api('/auth/login', {
    method: 'POST',
    body: { email: 'owner@enqoparentpro.et', password: 'admin123' },
  });
  const ownerToken = ownerLogin.data?.data?.token;

  const managerLogin = await api('/auth/login', {
    method: 'POST',
    body: { email: 'getnet.a@enqoparentpro.et', password: 'password123' },
  });
  const managerToken = managerLogin.data?.data?.token;

  const accountantLogin = await api('/auth/login', {
    method: 'POST',
    body: { email: 'selam.fikru@enqoparentpro.et', password: 'password123' },
  });
  const accountantToken = accountantLogin.data?.data?.token;

  const tenantLogin = await api('/auth/login', {
    method: 'POST',
    body: { email: 'abebe.kebede@gmail.com', password: 'password123' },
  });
  const tenantToken = tenantLogin.data?.data?.token;

  console.log(`  SUPER_ADMIN: ${adminToken ? 'OK' : 'FAIL'}`);
  console.log(`  OWNER:       ${ownerToken ? 'OK' : 'FAIL'}`);
  console.log(`  MANAGER:     ${managerToken ? 'OK' : 'FAIL'}`);
  console.log(`  ACCOUNTANT:  ${accountantToken ? 'OK' : 'FAIL'}`);
  console.log(`  TENANT:      ${tenantToken ? 'OK' : 'FAIL'}\n`);

  // Ensure available office 106
  const office106 = await prisma.office.findUnique({
    where: { id: 'off_abc_106' },
    include: { building: true },
  });

  const timestamp = Date.now();
  const testEmail = `acceptance.pilot.${timestamp}@gmail.com`;
  const testPhone = '09' + Math.floor(10000000 + Math.random() * 90000000);
  const rentAmount = 14500;

  console.log('[Setup] Creating isolated test tenant on Office 106...');
  const createTenantRes = await api('/tenants', {
    method: 'POST',
    token: ownerToken,
    body: {
      fullName: `Acceptance Tenant ${timestamp.toString().slice(-4)}`,
      phone: testPhone,
      email: testEmail,
      idNumber: `ID-${timestamp.toString().slice(-6)}`,
      officeId: 'off_abc_106',
      rent: rentAmount,
      frequency: 'MONTHLY',
      dueDay: 5,
    },
  });
  const testTenant = createTenantRes.data?.data?.tenant;
  const testContract = createTenantRes.data?.data?.contract;
  console.log(`  Created Tenant: ${testTenant?.id}, Contract: ${testContract?.id}\n`);

  // Webhook secret
  const webhookSecret = process.env.CHAPA_WEBHOOK_SECRET;

  // =========================================================================
  // SECTION 3: THE 12 PAYMENT LIFECYCLE TESTS
  // =========================================================================
  console.log('--- SECTION 3: 12 PAYMENT LIFECYCLE SCENARIOS ---');

  // Case 1: Checkout initialized -> PENDING
  const dbBefore1 = await prisma.payment.findFirst({ where: { contractId: testContract.id } });
  const initRes = await api('/gateway/chapa/initialize', {
    method: 'POST',
    token: adminToken,
    body: { tenantId: testTenant.id, returnUrl: 'http://localhost:5173/#/tenant' },
  });
  const txRef1 = initRes.data?.data?.txRef;
  const checkoutUrl1 = initRes.data?.data?.checkoutUrl;
  const dbAfter1 = await prisma.payment.findFirst({ where: { txnRef: txRef1 } });
  recordEvidence(
    1,
    'Checkout initialized → PENDING',
    initRes.status === 201 && dbAfter1?.status === 'PENDING' && !dbAfter1?.verifiedBySystem,
    `Pre-created PENDING payment attempt; TxRef: ${txRef1}; Checkout URL generated by Chapa`,
    dbBefore1 ? { id: dbBefore1.id, status: dbBefore1.status } : null,
    dbAfter1 ? { id: dbAfter1.id, status: dbAfter1.status, verifiedBySystem: dbAfter1.verifiedBySystem, amount: Number(dbAfter1.amount) } : null
  );

  // Case 2: Genuine provider verification success → APPROVED
  const dbBefore2 = { id: dbAfter1.id, status: dbAfter1.status };
  const validWebhookPayload2 = JSON.stringify({
    tx_ref: txRef1,
    status: 'success',
    amount: rentAmount,
    currency: 'ETB',
  });
  const sig2 = crypto.createHmac('sha256', webhookSecret).update(Buffer.from(validWebhookPayload2)).digest('hex');
  const webhookRes2 = await fetch(`${API_BASE}/gateway/chapa/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-chapa-signature': sig2 },
    body: validWebhookPayload2,
  });
  const dbAfter2 = await prisma.payment.findUnique({ where: { id: dbAfter1.id } });
  recordEvidence(
    2,
    'Genuine provider verification success → APPROVED',
    webhookRes2.status === 200 && dbAfter2?.status === 'APPROVED' && dbAfter2?.verifiedBySystem === true,
    `Transitioned to APPROVED via authentic HMAC-SHA256 signature; verifiedBySystem set to true`,
    dbBefore2,
    { id: dbAfter2.id, status: dbAfter2.status, verifiedBySystem: dbAfter2.verifiedBySystem, paymentDate: dbAfter2.paymentDate }
  );

  // Case 3: Provider failure → REJECTED
  const failTxRef = `CHAPA_FAIL_${Date.now()}`;
  const failPayment = await prisma.payment.create({
    data: {
      contractId: testContract.id,
      officeId: 'off_abc_106',
      buildingId: 'abc',
      tenantId: testTenant.id,
      period: 'September 2026',
      expectedAmount: rentAmount,
      amount: rentAmount,
      dueDate: new Date('2026-09-05T00:00:00Z'),
      submittedAt: new Date(),
      method: 'CHAPA',
      txnRef: failTxRef,
      status: 'PENDING',
      verifiedBySystem: false,
      isManual: false,
    },
  });
  const dbBefore3 = { id: failPayment.id, status: failPayment.status };
  const failPayload = JSON.stringify({ tx_ref: failTxRef, status: 'failed' });
  const failSig = crypto.createHmac('sha256', webhookSecret).update(Buffer.from(failPayload)).digest('hex');
  const webhookFailRes = await fetch(`${API_BASE}/gateway/chapa/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-chapa-signature': failSig },
    body: failPayload,
  });
  const dbAfter3 = await prisma.payment.findUnique({ where: { id: failPayment.id } });
  recordEvidence(
    3,
    'Provider failure → REJECTED',
    webhookFailRes.status === 200 && dbAfter3?.status === 'REJECTED',
    `Transitioned to REJECTED; rejectionReason: ${dbAfter3?.rejectionReason}`,
    dbBefore3,
    { id: dbAfter3.id, status: dbAfter3.status, rejectionReason: dbAfter3.rejectionReason }
  );

  // Case 4: Invalid signature → rejected
  const fakeSigTxRef = `CHAPA_SIG_${Date.now()}`;
  const pendingSigPayment = await prisma.payment.create({
    data: {
      contractId: testContract.id,
      officeId: 'off_abc_106',
      buildingId: 'abc',
      tenantId: testTenant.id,
      period: 'September 2026',
      expectedAmount: rentAmount,
      amount: rentAmount,
      dueDate: new Date('2026-09-05T00:00:00Z'),
      submittedAt: new Date(),
      method: 'CHAPA',
      txnRef: fakeSigTxRef,
      status: 'PENDING',
      verifiedBySystem: false,
      isManual: false,
    },
  });
  const dbBefore4 = { id: pendingSigPayment.id, status: pendingSigPayment.status };
  const forgedRes = await fetch(`${API_BASE}/gateway/chapa/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-chapa-signature': 'forged_fake_signature_hash_1234567890abcdef' },
    body: JSON.stringify({ tx_ref: fakeSigTxRef, status: 'success' }),
  });
  const dbAfter4 = await prisma.payment.findUnique({ where: { id: pendingSigPayment.id } });
  recordEvidence(
    4,
    'Invalid signature → rejected',
    forgedRes.status === 400 && dbAfter4?.status === 'PENDING',
    `HTTP ${forgedRes.status} Bad Request; DB record remains PENDING with zero modification`,
    dbBefore4,
    { id: dbAfter4.id, status: dbAfter4.status }
  );

  // Case 5: Duplicate successful webhook → no additional credit
  const dbBefore5 = { id: dbAfter2.id, status: dbAfter2.status };
  const dupWebhookRes = await fetch(`${API_BASE}/gateway/chapa/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-chapa-signature': sig2 },
    body: validWebhookPayload2,
  });
  const dbAfter5 = await prisma.payment.findUnique({ where: { id: dbAfter2.id } });
  const allTxRef1Count = await prisma.payment.count({ where: { txnRef: txRef1 } });
  recordEvidence(
    5,
    'Duplicate successful webhook → no additional credit',
    dupWebhookRes.status === 200 && dbAfter5?.status === 'APPROVED' && allTxRef1Count === 1,
    `Acknowledged HTTP 200 OK without duplicate ledger entry (total records with txRef: ${allTxRef1Count})`,
    dbBefore5,
    { id: dbAfter5.id, status: dbAfter5.status, count: allTxRef1Count }
  );

  // Case 6: Concurrent successful webhooks → exactly one approval
  const concurrentTxRef = `CHAPA_CONCUR_${Date.now()}`;
  const concurrentPayment = await prisma.payment.create({
    data: {
      contractId: testContract.id,
      officeId: 'off_abc_106',
      buildingId: 'abc',
      tenantId: testTenant.id,
      period: 'September 2026',
      expectedAmount: rentAmount,
      amount: rentAmount,
      dueDate: new Date('2026-09-05T00:00:00Z'),
      submittedAt: new Date(),
      method: 'CHAPA',
      txnRef: concurrentTxRef,
      status: 'PENDING',
      verifiedBySystem: false,
      isManual: false,
    },
  });
  const dbBefore6 = { id: concurrentPayment.id, status: concurrentPayment.status };
  const concurPayload = JSON.stringify({ tx_ref: concurrentTxRef, status: 'success', amount: rentAmount, currency: 'ETB' });
  const concurSig = crypto.createHmac('sha256', webhookSecret).update(Buffer.from(concurPayload)).digest('hex');
  const concurCalls = await Promise.all([
    fetch(`${API_BASE}/gateway/chapa/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-chapa-signature': concurSig },
      body: concurPayload,
    }),
    fetch(`${API_BASE}/gateway/chapa/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-chapa-signature': concurSig },
      body: concurPayload,
    }),
  ]);
  const dbAfter6 = await prisma.payment.findUnique({ where: { id: concurrentPayment.id } });
  const auditLogsConcur = await prisma.auditLog.count({ where: { entityId: concurrentPayment.id, action: 'WEBHOOK_PAYMENT_CONFIRMED' } });
  recordEvidence(
    6,
    'Concurrent successful webhooks → exactly one approval',
    concurCalls.every((r) => r.status === 200) && dbAfter6?.status === 'APPROVED' && auditLogsConcur === 1,
    `Both concurrent calls handled safely (HTTP 200); exactly 1 confirmation audit log recorded`,
    dbBefore6,
    { id: dbAfter6.id, status: dbAfter6.status, auditLogCount: auditLogsConcur }
  );

  // Case 7: Failed event arriving after successful approval → no downgrade
  const dbBefore7 = { id: dbAfter2.id, status: dbAfter2.status };
  const lateFailPayload = JSON.stringify({ tx_ref: txRef1, status: 'failed' });
  const lateFailSig = crypto.createHmac('sha256', webhookSecret).update(Buffer.from(lateFailPayload)).digest('hex');
  const lateFailRes = await fetch(`${API_BASE}/gateway/chapa/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-chapa-signature': lateFailSig },
    body: lateFailPayload,
  });
  const dbAfter7 = await prisma.payment.findUnique({ where: { id: dbAfter2.id } });
  recordEvidence(
    7,
    'Failed event arriving after successful approval → no downgrade',
    lateFailRes.status === 200 && dbAfter7?.status === 'APPROVED',
    `Acknowledged without downgrading; status remains APPROVED`,
    dbBefore7,
    { id: dbAfter7.id, status: dbAfter7.status }
  );

  // Case 8: Incorrect amount → no approval
  const amtTamperTxRef = `CHAPA_AMT_${Date.now()}`;
  const amtPayment = await prisma.payment.create({
    data: {
      contractId: testContract.id,
      officeId: 'off_abc_106',
      buildingId: 'abc',
      tenantId: testTenant.id,
      period: 'September 2026',
      expectedAmount: rentAmount,
      amount: rentAmount,
      dueDate: new Date('2026-09-05T00:00:00Z'),
      submittedAt: new Date(),
      method: 'CHAPA',
      txnRef: amtTamperTxRef,
      status: 'PENDING',
      verifiedBySystem: false,
      isManual: false,
    },
  });
  const dbBefore8 = { id: amtPayment.id, status: amtPayment.status, expected: rentAmount };
  const amtPayload = JSON.stringify({ tx_ref: amtTamperTxRef, status: 'success', amount: 5000, currency: 'ETB' });
  const amtSig = crypto.createHmac('sha256', webhookSecret).update(Buffer.from(amtPayload)).digest('hex');
  const amtRes = await fetch(`${API_BASE}/gateway/chapa/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-chapa-signature': amtSig },
    body: amtPayload,
  });
  const dbAfter8 = await prisma.payment.findUnique({ where: { id: amtPayment.id } });
  recordEvidence(
    8,
    'Incorrect amount → no approval',
    amtRes.status === 400 && dbAfter8?.status === 'PENDING',
    `Rejected underpayment (reported 5000 vs expected ${rentAmount}); HTTP ${amtRes.status}; DB status remains PENDING`,
    dbBefore8,
    { id: dbAfter8.id, status: dbAfter8.status }
  );

  // Case 9: Incorrect currency → no approval
  const currTamperTxRef = `CHAPA_CURR_${Date.now()}`;
  const currPayment = await prisma.payment.create({
    data: {
      contractId: testContract.id,
      officeId: 'off_abc_106',
      buildingId: 'abc',
      tenantId: testTenant.id,
      period: 'September 2026',
      expectedAmount: rentAmount,
      amount: rentAmount,
      dueDate: new Date('2026-09-05T00:00:00Z'),
      submittedAt: new Date(),
      method: 'CHAPA',
      txnRef: currTamperTxRef,
      status: 'PENDING',
      verifiedBySystem: false,
      isManual: false,
    },
  });
  const dbBefore9 = { id: currPayment.id, status: currPayment.status };
  const currPayload = JSON.stringify({ tx_ref: currTamperTxRef, status: 'success', amount: rentAmount, currency: 'USD' });
  const currSig = crypto.createHmac('sha256', webhookSecret).update(Buffer.from(currPayload)).digest('hex');
  const currRes = await fetch(`${API_BASE}/gateway/chapa/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-chapa-signature': currSig },
    body: currPayload,
  });
  const dbAfter9 = await prisma.payment.findUnique({ where: { id: currPayment.id } });
  recordEvidence(
    9,
    'Incorrect currency → no approval',
    currRes.status === 400 && dbAfter9?.status === 'PENDING',
    `Rejected invalid currency (USD vs expected ETB); HTTP ${currRes.status}; DB status remains PENDING`,
    dbBefore9,
    { id: dbAfter9.id, status: dbAfter9.status }
  );

  // Case 10: Unknown transaction reference → no approval
  const unknownTxRef = `CHAPA_NON_EXISTENT_${Date.now()}`;
  const unkPayload = JSON.stringify({ tx_ref: unknownTxRef, status: 'success', amount: rentAmount, currency: 'ETB' });
  const unkSig = crypto.createHmac('sha256', webhookSecret).update(Buffer.from(unkPayload)).digest('hex');
  const unkRes = await fetch(`${API_BASE}/gateway/chapa/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-chapa-signature': unkSig },
    body: unkPayload,
  });
  const unkPaymentCheck = await prisma.payment.findFirst({ where: { txnRef: unknownTxRef } });
  recordEvidence(
    10,
    'Unknown transaction reference → no approval',
    unkRes.status === 404 && unkPaymentCheck === null,
    `Rejected with HTTP 404 Not Found; zero orphan records created`,
    null,
    null
  );

  // Case 11: Browser return without provider verification → no approval
  // Create a pending payment and attempt verifyChapa while provider status is pending
  const pendingBrowserRef = `CHAPA_BROWSER_${Date.now()}`;
  const pendingBrowserPay = await prisma.payment.create({
    data: {
      contractId: testContract.id,
      officeId: 'off_abc_106',
      buildingId: 'abc',
      tenantId: testTenant.id,
      period: 'September 2026',
      expectedAmount: rentAmount,
      amount: rentAmount,
      dueDate: new Date('2026-09-05T00:00:00Z'),
      submittedAt: new Date(),
      method: 'CHAPA',
      txnRef: pendingBrowserRef,
      status: 'PENDING',
      verifiedBySystem: false,
      isManual: false,
    },
  });
  const dbBefore11 = { id: pendingBrowserPay.id, status: pendingBrowserPay.status };
  const browserVerifyRes = await api(`/gateway/chapa/verify/${pendingBrowserRef}`, { token: adminToken });
  const dbAfter11 = await prisma.payment.findUnique({ where: { id: pendingBrowserPay.id } });
  recordEvidence(
    11,
    'Browser return without provider verification → no approval',
    (browserVerifyRes.status === 400 || browserVerifyRes.status === 404) && dbAfter11?.status === 'PENDING',
    `Browser return callback alone cannot approve; HTTP ${browserVerifyRes.status}; DB status remains PENDING`,
    dbBefore11,
    { id: dbAfter11.id, status: dbAfter11.status }
  );

  // Case 12: Manual receipt submission → PENDING until authorized approval
  const manualRef = `CBE_${Date.now()}`;
  const manualPayRes = await api('/gateway/instant-pay', {
    method: 'POST',
    token: adminToken,
    body: {
      tenantId: testTenant.id,
      method: 'Bank_Transfer',
      amount: rentAmount,
      txnRef: manualRef,
      note: 'Deposit slip verification probe',
    },
  });
  const manualPaymentId = manualPayRes.data?.data?.id;
  const dbBefore12 = await prisma.payment.findUnique({ where: { id: manualPaymentId } });

  // Accountant approves
  const approveRes = await api(`/payments/${manualPaymentId}/approve`, {
    method: 'POST',
    token: accountantToken,
  });
  const dbAfter12 = await prisma.payment.findUnique({ where: { id: manualPaymentId } });
  recordEvidence(
    12,
    'Manual receipt submission → PENDING until authorized approval',
    dbBefore12?.status === 'PENDING' && approveRes.status === 200 && dbAfter12?.status === 'APPROVED' && dbAfter12?.verifiedById !== null,
    `Created as PENDING; approved by Estate Accountant; verifiedById: ${dbAfter12?.verifiedById}`,
    { id: dbBefore12?.id, status: dbBefore12?.status, isManual: dbBefore12?.isManual },
    { id: dbAfter12?.id, status: dbAfter12?.status, verifiedById: dbAfter12?.verifiedById }
  );

  // =========================================================================
  // CLEANUP TEST DATA
  // =========================================================================
  console.log('\n[Cleanup] Cleaning up isolated test lease...');
  await api(`/tenants/${testTenant.id}/end`, { method: 'POST', token: ownerToken }).catch(() => {});

  // =========================================================================
  // SCORECARD
  // =========================================================================
  const total = evidenceResults.length;
  const passed = evidenceResults.filter((e) => e.passed).length;
  console.log('========================================================================');
  console.log(`   LIFECYCLE TESTS: ${passed} / ${total} VERIFIED (${Math.round((passed / total) * 100)}%)`);
  console.log('========================================================================\n');
}

runPilotAcceptanceTests().catch((err) => {
  console.error('Fatal Test Execution Error:', err);
  process.exit(1);
});
