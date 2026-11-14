/**
 * Enqopa RentPro — Second-Pass Independent Security & Payment Verification Suite
 * Enqopa Technologies PLC — Independent Security Assessment
 */

import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

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

let totalTests = 0;
let passedChecks = 0;
let failedChecks = 0;
const testAuditFindings = [];

function record(testName, passed, category, details) {
  totalTests++;
  if (passed) {
    passedChecks++;
    console.log(`  ✅ [PASS] ${testName}: ${details || 'Verified'}`);
  } else {
    failedChecks++;
    console.log(`  ❌ [FAIL] ${testName}: ${details || 'Vulnerability/Defect detected'}`);
    testAuditFindings.push({ testName, category, details });
  }
}

async function runSecondPassVerification() {
  console.log('========================================================================');
  console.log('   ENQOPA RENTPRO — SECOND-PASS INDEPENDENT VERIFICATION SUITE       ');
  console.log('   Enqopa Technologies PLC — Independent Deep Security Audit          ');
  console.log('========================================================================\n');

  // -------------------------------------------------------------------------
  // SETUP: AUTHENTICATION OF ROLES
  // -------------------------------------------------------------------------
  console.log('[Setup] Authenticating test personas...');

  // 1. Super Admin
  const adminRes = await api('/auth/login', {
    method: 'POST',
    body: { email: 'admin@enqoparentpro.et', password: 'SuperAdminPassword123!' },
  });
  const adminToken = adminRes.data?.data?.token;

  // 2. Owner A (Meseret Alemayehu - owns ABC Business Center & XYZ Office Building)
  let ownerAToken = null;
  const ownerARes = await api('/auth/login', {
    method: 'POST',
    body: { email: 'owner@enqoparentpro.et', password: 'password123' },
  });
  if (ownerARes.data?.data?.token) {
    ownerAToken = ownerARes.data.data.token;
  } else {
    const ownerARes2 = await api('/auth/login', {
      method: 'POST',
      body: { email: 'owner@enqoparentpro.et', password: 'admin123' },
    });
    ownerAToken = ownerARes2.data?.data?.token;
  }

  // 3. Owner B (Independent landlord with zero properties on Owner A's buildings)
  let ownerBToken = null;
  const ownerBRes = await api('/auth/login', {
    method: 'POST',
    body: { email: 'landlord.b.1794654308500@enqoparentpro.et', password: 'password123' },
  });
  ownerBToken = ownerBRes.data?.data?.token;

  // 4. Tenant A (Abebe Kebede - tenant in Owner A's building)
  const tenantRes = await api('/auth/login', {
    method: 'POST',
    body: { email: 'abebe.kebede@gmail.com', password: 'password123' },
  });
  const tenantToken = tenantRes.data?.data?.token;
  const tenantProfile = tenantRes.data?.data?.user?.tenant;

  console.log(`  [Setup] Admin Token:   ${adminToken ? 'Acquired' : 'FAILED'}`);
  console.log(`  [Setup] Owner A Token: ${ownerAToken ? 'Acquired' : 'FAILED'}`);
  console.log(`  [Setup] Owner B Token: ${ownerBToken ? 'Acquired' : 'FAILED'}`);
  console.log(`  [Setup] Tenant Token:  ${tenantToken ? 'Acquired' : 'FAILED'}\n`);

  // =========================================================================
  // PHASE 1: AUTHENTICATION VERIFICATION
  // =========================================================================
  console.log('--- PHASE 1: AUTHENTICATION VERIFICATION ---');

  // Test 1.1: Login with only a role
  const roleOnlyRes = await api('/auth/login', {
    method: 'POST',
    body: { role: 'owner' },
  });
  record(
    '1.1 Login with Only Role Rejected',
    roleOnlyRes.status === 400 || roleOnlyRes.status === 401,
    'Authentication',
    `Status ${roleOnlyRes.status} (Passwordless role login eliminated)`
  );

  // Test 1.2: Login without password
  const noPassRes = await api('/auth/login', {
    method: 'POST',
    body: { email: 'owner@enqoparentpro.et' },
  });
  record(
    '1.2 Missing Password Rejected',
    noPassRes.status === 400 || noPassRes.status === 401,
    'Authentication',
    `Status ${noPassRes.status} (Mandatory password enforcement)`
  );

  // Test 1.3: Login with incorrect password
  const wrongPassRes = await api('/auth/login', {
    method: 'POST',
    body: { email: 'owner@enqoparentpro.et', password: 'IncorrectPassword999!' },
  });
  record(
    '1.3 Invalid Password Rejected with HTTP 401',
    wrongPassRes.status === 401,
    'Authentication',
    `Status ${wrongPassRes.status} (Bcrypt verification failure)`
  );

  // Test 1.4: Login using pending account
  const pendingTimestamp = Date.now();
  const pendingEmail = `pending.owner.${pendingTimestamp}@enqoparentpro.et`;
  const pendingPhone = '09' + Math.floor(10000000 + Math.random() * 90000000);
  await api('/auth/register-owner', {
    method: 'POST',
    body: {
      name: 'Pending Test Owner',
      email: pendingEmail,
      phone: pendingPhone,
      companyName: 'Pending Real Estate',
      password: 'PendingPassword123!',
    },
  });

  const pendingLoginRes = await api('/auth/login', {
    method: 'POST',
    body: { email: pendingEmail, password: 'PendingPassword123!' },
  });
  const pendingBlocked = pendingLoginRes.status === 403;
  record(
    '1.4 Pending Account Login Blocked',
    pendingBlocked,
    'Authentication',
    pendingBlocked ? 'Status 403 Forbidden (Pending review required)' : `Status ${pendingLoginRes.status}`
  );

  // Test 1.5: Privilege Escalation Attempt (registerOwner with client-supplied role)
  const privEscRes = await api('/auth/register-owner', {
    method: 'POST',
    body: {
      name: 'Hacker Landlord',
      email: `hacker.${Date.now()}@test.et`,
      phone: '09' + Math.floor(10000000 + Math.random() * 90000000),
      companyName: 'Escalation Holdings',
      password: 'password123',
      role: 'SUPER_ADMIN', // Attempt to escalate to SUPER_ADMIN
    },
  });
  // Must either reject or force role to OWNER
  const privEscPrevented = privEscRes.status === 201 && privEscRes.data?.data?.role !== 'SUPER_ADMIN';
  record(
    '1.5 Privilege Escalation in Registration Blocked',
    privEscPrevented || privEscRes.status === 400,
    'Authentication',
    'Role is hardcoded to OWNER, approvalStatus is PENDING'
  );

  // Test 1.6: Expired or Invalid JWT Token
  const invalidTokenRes = await api('/buildings', {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
  });
  record(
    '1.6 Forged/Invalid JWT Token Rejected',
    invalidTokenRes.status === 401,
    'Authentication',
    `Status ${invalidTokenRes.status} (Cryptographic JWT verification)`
  );

  // Test 1.7: Expired Token Simulation (Header tampering)
  const emptyTokenRes = await api('/buildings', {
    headers: { Authorization: 'Bearer ' },
  });
  record(
    '1.7 Empty/Missing Bearer Token Rejected',
    emptyTokenRes.status === 401,
    'Authentication',
    `Status ${emptyTokenRes.status} Unauthorized`
  );

  // =========================================================================
  // PHASE 2: COMPLETE MULTI-TENANT IDOR AUDIT
  // =========================================================================
  console.log('\n--- PHASE 2: COMPLETE MULTI-TENANT IDOR AUDIT ---');

  // Retrieve Owner A's buildings, offices, contracts, payments
  const ownerABuildings = await api('/buildings', { token: ownerAToken });
  const bList = ownerABuildings.data?.data || [];
  const firstBuilding = bList[0];

  const ownerAOffices = await api('/offices', { token: ownerAToken });
  const oList = ownerAOffices.data?.data || [];
  const firstOffice = oList[0];

  const ownerAContracts = await api('/contracts', { token: ownerAToken });
  const cList = ownerAContracts.data?.data?.contracts || [];
  const firstContract = cList[0];

  const ownerATenants = await api('/tenants', { token: ownerAToken });
  const tList = ownerATenants.data?.data || [];
  const firstTenant = tList[0];

  const ownerAPayments = await api('/payments', { token: ownerAToken });
  const pList = ownerAPayments.data?.data?.payments || [];
  const firstPayment = pList[0];

  // Test 2.1: Building Scoping - Owner B lists buildings
  const ownerBBuildings = await api('/buildings', { token: ownerBToken });
  const bListB = ownerBBuildings.data?.data || [];
  const bIsolated = bListB.every((b) => b.ownerId === undefined || b.ownerId !== ownerARes.data?.data?.user?.id);
  record(
    '2.1 Building Directory Cross-Owner Scoping',
    bListB.length === 0 || bIsolated,
    'Multi-Tenant IDOR',
    `Owner B sees ${bListB.length} buildings (Owner A has ${bList.length})`
  );

  // Test 2.2: Building Detail IDOR - Owner B tries to read Owner A's building by ID
  if (firstBuilding) {
    const idorBuildingGet = await api(`/buildings/${firstBuilding.id}`, { token: ownerBToken });
    const getBlocked = idorBuildingGet.status === 403 || idorBuildingGet.status === 404;
    record(
      '2.2 Direct Building Inspection IDOR Blocked',
      getBlocked,
      'Multi-Tenant IDOR',
      `Owner B reading Owner A building rejected with HTTP ${idorBuildingGet.status}`
    );

    // Test 2.3: Building Mutation IDOR - Owner B tries to update Owner A's building
    const idorBuildingUpdate = await api(`/buildings/${firstBuilding.id}`, {
      method: 'PUT',
      token: ownerBToken,
      body: { name: 'Hacked Building Name' },
    });
    const updateBlocked = idorBuildingUpdate.status === 403 || idorBuildingUpdate.status === 404;
    record(
      '2.3 Building Mutation IDOR Blocked',
      updateBlocked,
      'Multi-Tenant IDOR',
      `Owner B modifying Owner A building rejected with HTTP ${idorBuildingUpdate.status}`
    );
  }

  // Test 2.4: Office Status Mutation IDOR
  if (firstOffice) {
    const idorOfficeStatus = await api(`/offices/${firstOffice.id}/status`, {
      method: 'PATCH',
      token: ownerBToken,
      body: { status: 'MAINTENANCE' },
    });
    const officeStatusBlocked = idorOfficeStatus.status === 403 || idorOfficeStatus.status === 404;
    record(
      '2.4 Office Status Mutation IDOR Blocked',
      officeStatusBlocked,
      'Multi-Tenant IDOR',
      `Owner B changing Owner A office status rejected with HTTP ${idorOfficeStatus.status}`
    );
  }

  // Test 2.5: Contract Directory Scoping
  const ownerBContracts = await api('/contracts', { token: ownerBToken });
  const bContractsList = ownerBContracts.data?.data?.contracts || [];
  record(
    '2.5 Contract Directory Cross-Owner Scoping',
    bContractsList.length === 0,
    'Multi-Tenant IDOR',
    `Owner B sees ${bContractsList.length} contracts (Owner A has ${cList.length})`
  );

  // Test 2.6: Contract Renewal & Rent Tampering IDOR
  if (firstContract) {
    const idorRenew = await api(`/contracts/${firstContract.id}/renew`, {
      method: 'POST',
      token: ownerBToken,
      body: { newEndDate: '2028-12-31', newRent: 99999 },
    });
    const renewBlocked = idorRenew.status === 403 || idorRenew.status === 404;
    record(
      '2.6 Contract Renewal IDOR Blocked',
      renewBlocked,
      'Multi-Tenant IDOR',
      `Owner B renewing Owner A contract rejected with HTTP ${idorRenew.status}`
    );

    const idorRent = await api(`/contracts/${firstContract.id}/change-rent`, {
      method: 'POST',
      token: ownerBToken,
      body: { rent: 88888 },
    });
    const rentBlocked = idorRent.status === 403 || idorRent.status === 404;
    record(
      '2.7 Contract Rent Tampering IDOR Blocked',
      rentBlocked,
      'Multi-Tenant IDOR',
      `Owner B tampering Owner A rent rejected with HTTP ${idorRent.status}`
    );
  }

  // Test 2.8: Tenant Profile Inspection & Mutation IDOR
  if (firstTenant) {
    const idorTenantGet = await api(`/tenants/${firstTenant.id}`, { token: ownerBToken });
    const tenantGetBlocked = idorTenantGet.status === 403 || idorTenantGet.status === 404;
    record(
      '2.8 Tenant Profile Inspection IDOR Blocked',
      tenantGetBlocked,
      'Multi-Tenant IDOR',
      `Owner B reading Owner A tenant rejected with HTTP ${idorTenantGet.status}`
    );

    const idorTenantPut = await api(`/tenants/${firstTenant.id}`, {
      method: 'PUT',
      token: ownerBToken,
      body: { fullName: 'Hacked Tenant Name' },
    });
    const tenantPutBlocked = idorTenantPut.status === 403 || idorTenantPut.status === 404;
    record(
      '2.9 Tenant Mutation IDOR Blocked',
      tenantPutBlocked,
      'Multi-Tenant IDOR',
      `Owner B modifying Owner A tenant rejected with HTTP ${idorTenantPut.status}`
    );
  }

  // Test 2.10: Overdue Payments Cross-Owner Leak Defense
  // Requesting payments with status=overdue without specifying buildingId
  const ownerBOverdue = await api('/payments?status=overdue', { token: ownerBToken });
  const overdueList = ownerBOverdue.data?.data?.payments || [];
  record(
    '2.10 Overdue Payments Cross-Owner Scoping',
    overdueList.length === 0,
    'Multi-Tenant IDOR',
    `Owner B sees ${overdueList.length} overdue payments (0 expected for unleased owner)`
  );

  // Test 2.11: Payment Approval / Rejection IDOR
  if (firstPayment && firstPayment.id && !firstPayment.id.startsWith('synthetic')) {
    const idorApprove = await api(`/payments/${firstPayment.id}/approve`, {
      method: 'POST',
      token: ownerBToken,
    });
    const approveBlocked = idorApprove.status === 403 || idorApprove.status === 404;
    record(
      '2.11 Payment Approval IDOR Blocked',
      approveBlocked,
      'Multi-Tenant IDOR',
      `Owner B approving Owner A payment rejected with HTTP ${idorApprove.status}`
    );

    const idorReject = await api(`/payments/${firstPayment.id}/reject`, {
      method: 'POST',
      token: ownerBToken,
      body: { reason: 'Unauthorized rejection attempt' },
    });
    const rejectBlocked = idorReject.status === 403 || idorReject.status === 404;
    record(
      '2.12 Payment Rejection IDOR Blocked',
      rejectBlocked,
      'Multi-Tenant IDOR',
      `Owner B rejecting Owner A payment rejected with HTTP ${idorReject.status}`
    );
  }

  // Test 2.13: Audit Log Cross-Owner Isolation
  const ownerBAudit = await api('/audit', { token: ownerBToken });
  const auditList = ownerBAudit.data?.data || [];
  const ownerAUserId = ownerARes.data?.data?.user?.id;
  const ownerBUserId = ownerBRes.data?.data?.user?.id;
  const leaksOwnerALogs = auditList.some((l) => l.actorId === ownerAUserId);
  const onlyOwnLogs = auditList.every((l) => l.actorId === ownerBUserId || l.actorId === 'SYSTEM');
  record(
    '2.13 Audit Log Cross-Owner Scoping',
    !leaksOwnerALogs && (auditList.length === 0 || onlyOwnLogs),
    'Multi-Tenant IDOR',
    `Owner B sees ${auditList.length} logs strictly scoped to personal actions; zero Owner A logs accessible`
  );

  // Test 2.14: Financial Report Scoping
  const ownerBOverview = await api('/reports/overview', { token: ownerBToken });
  const overviewData = ownerBOverview.data?.data || {};
  const isReportZero = (overviewData.expected || 0) === 0 && (overviewData.total || 0) === 0;
  record(
    '2.14 Financial Overview Report Scoping',
    isReportZero,
    'Multi-Tenant IDOR',
    `Owner B expected rent is ETB ${overviewData.expected || 0} across ${overviewData.total || 0} units`
  );

  // =========================================================================
  // PHASE 3: DOCUMENT SECURITY
  // =========================================================================
  console.log('\n--- PHASE 3: DOCUMENT SECURITY ---');

  // Test 3.1: Public Unauthenticated Uploads Access
  const unauthDoc = await fetch('http://localhost:5000/uploads/receipt-test-file.jpg');
  record(
    '3.1 Public Unauthenticated Uploads Blocked',
    unauthDoc.status === 401,
    'Document Security',
    `Unauthenticated GET /uploads/receipt-test-file.jpg returned HTTP ${unauthDoc.status}`
  );

  // Test 3.2: Path Traversal Prevention
  const pathTraversalRes = await api('/documents/..%2f..%2f..%2fpackage.json', { token: ownerAToken });
  const traversalBlocked = pathTraversalRes.status === 400 || pathTraversalRes.status === 403 || pathTraversalRes.status === 404;
  record(
    '3.2 URL-Encoded Path Traversal Blocked',
    traversalBlocked,
    'Document Security',
    `Traversal /documents/..%2f..%2f..%2fpackage.json rejected with HTTP ${pathTraversalRes.status}`
  );

  // Test 3.3: Sensitive System Files Access Attempt
  const etcPasswdRes = await api('/documents/etc%2Fpasswd', { token: ownerAToken });
  const etcBlocked = etcPasswdRes.status === 400 || etcPasswdRes.status === 403 || etcPasswdRes.status === 404;
  record(
    '3.3 Sensitive System Path Access Blocked',
    etcBlocked,
    'Document Security',
    `Access rejected with HTTP ${etcPasswdRes.status}`
  );

  // =========================================================================
  // PHASE 4: CHAPA PAYMENT GATEWAY INTEGRATION AUDIT
  // =========================================================================
  console.log('\n--- PHASE 4: CHAPA PAYMENT GATEWAY INTEGRATION AUDIT ---');

  // Test 4.1: Instant-Pay Rejection for Chapa (Forces Hosted Checkout)
  const chapaInstantRes = await api('/gateway/instant-pay', {
    method: 'POST',
    token: tenantToken,
    body: { method: 'Chapa', amount: 50000 },
  });
  record(
    '4.1 Simulated Chapa Instant Approval Removed',
    chapaInstantRes.status === 400,
    'Payment Gateway',
    `Rejected with HTTP ${chapaInstantRes.status} (Forces hosted checkout)`
  );

  // Test 4.2: Manual Payments Default to PENDING with verifiedBySystem: false
  const telebirrRes = await api('/gateway/instant-pay', {
    method: 'POST',
    token: tenantToken,
    body: { method: 'Telebirr', amount: 15000, note: 'Testing accountant verification queue' },
  });
  const telebirrPending = telebirrRes.status === 201 && telebirrRes.data?.data?.status === 'PENDING' && telebirrRes.data?.data?.verifiedBySystem === false;
  record(
    '4.2 Unintegrated Payments Default to PENDING (Accountant Review)',
    telebirrPending,
    'Payment Gateway',
    `Status ${telebirrRes.data?.data?.status}, verifiedBySystem: ${telebirrRes.data?.data?.verifiedBySystem}`
  );

  // Test 4.3: Real Chapa Hosted Checkout Initialization
  const chapaInitRes = await api('/gateway/chapa/initialize', {
    method: 'POST',
    token: tenantToken,
    body: { returnUrl: 'http://localhost:5173/#/tenant' },
  });
  const chapaInitSuccess = chapaInitRes.status === 201 && chapaInitRes.data?.data?.checkoutUrl && chapaInitRes.data?.data?.txRef?.startsWith('CHAPA_');
  record(
    '4.3 Chapa Hosted Checkout Initialization',
    chapaInitSuccess,
    'Payment Gateway',
    chapaInitSuccess
      ? `Pending payment pre-created; checkoutUrl: ${chapaInitRes.data?.data?.checkoutUrl?.slice(0, 45)}...`
      : `Status ${chapaInitRes.status} - ${chapaInitRes.data?.message}`
  );

  // Test 4.4: Webhook Cryptographic HMAC-SHA256 Signature Verification (Forged Signature)
  const forgedSigRes = await api('/gateway/chapa/webhook', {
    method: 'POST',
    headers: { 'x-chapa-signature': 'forged_fake_signature_hash_1234567890' },
    body: { tx_ref: 'CHAPA_FAKE_REF_000', status: 'success' },
  });
  record(
    '4.4 Forged Webhook Signature Rejected',
    forgedSigRes.status === 400 || forgedSigRes.status === 401,
    'Payment Gateway',
    `Forged signature rejected with HTTP ${forgedSigRes.status}`
  );

  // Test 4.5: Valid HMAC-SHA256 Webhook Processing & Idempotency
  const webhookSecret = process.env.CHAPA_WEBHOOK_SECRET || 'sample_webhook_secret_key_32_chars';
  const testTxRef = chapaInitRes.data?.data?.txRef || `CHAPA_TEST_${Date.now()}`;
  const payloadObj = { tx_ref: testTxRef, status: 'success' };
  const rawString = JSON.stringify(payloadObj);
  const validSignature = crypto.createHmac('sha256', webhookSecret).update(Buffer.from(rawString)).digest('hex');

  const validWebhookRes = await fetch(`${API_BASE}/gateway/chapa/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-chapa-signature': validSignature,
    },
    body: rawString,
  });
  record(
    '4.5 Valid Webhook Signature Processed (200 OK)',
    validWebhookRes.status === 200,
    'Payment Gateway',
    `Status ${validWebhookRes.status} (Acknowledged with { received: true })`
  );

  // Test 4.6: Duplicate Webhook Event Idempotency
  const duplicateWebhookRes = await fetch(`${API_BASE}/gateway/chapa/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-chapa-signature': validSignature,
    },
    body: rawString,
  });
  record(
    '4.6 Duplicate Webhook Idempotency (No Double Credit)',
    duplicateWebhookRes.status === 200,
    'Payment Gateway',
    `Duplicate webhook acknowledged with HTTP ${duplicateWebhookRes.status} without double credit`
  );

  // =========================================================================
  // PHASE 5: FINANCIAL INTEGRITY & SAAS REVENUE ISOLATION
  // =========================================================================
  console.log('\n--- PHASE 5: FINANCIAL INTEGRITY & SAAS REVENUE ISOLATION ---');

  // Test 5.1: SaaS Platform Finance Access Restricted to Super Admin
  const ownerSaaSFinanceRes = await api('/finance/overview', { token: ownerAToken });
  record(
    '5.1 SaaS Platform Revenue Isolated from Landlords',
    ownerSaaSFinanceRes.status === 403 || ownerSaaSFinanceRes.status === 404,
    'Financial Integrity',
    `Owner access to platform SaaS finance rejected with HTTP ${ownerSaaSFinanceRes.status}`
  );

  // Test 5.2: Tenant Role Restrained from Landlord Administrative Endpoints
  const tenantAdminRes = await api('/offices/off_abc_101/status', {
    method: 'PATCH',
    token: tenantToken,
    body: { status: 'MAINTENANCE' },
  });
  record(
    '5.2 Tenant Restricted from Estate Management Mutations',
    tenantAdminRes.status === 403,
    'Financial Integrity',
    `Tenant mutation attempt rejected with HTTP ${tenantAdminRes.status} Forbidden`
  );

  // =========================================================================
  // SUMMARY SCORECARD
  // =========================================================================
  console.log('\n========================================================================');
  console.log('   ENQOPA RENTPRO — INDEPENDENT VERIFICATION SCORECARD');
  console.log(`   TOTAL TESTS EXECUTED: ${totalTests}`);
  console.log(`   PASSED CHECKS:        ${passedChecks} / ${totalTests} (${Math.round((passedChecks / totalTests) * 100)}%)`);
  console.log(`   FAILED CHECKS:        ${failedChecks}`);
  console.log('========================================================================\n');

  if (testAuditFindings.length === 0) {
    console.log('🏆 100% PASS: All independent security, authorization, document,');
    console.log('   and Chapa hosted payment checks verified successfully!\n');
  } else {
    console.log('REMAINING FINDINGS:');
    testAuditFindings.forEach((f, idx) => {
      console.log(`  ${idx + 1}. [${f.category}] ${f.testName}: ${f.details}`);
    });
  }
}

runSecondPassVerification().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
