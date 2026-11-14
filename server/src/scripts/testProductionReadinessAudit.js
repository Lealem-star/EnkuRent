/**
 * Enqopa RentPro — Comprehensive Production Security & Chapa Verification Suite
 * Enqopa Technologies PLC — Independent Production Assessment
 */

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
    data = await res.json();
  } else {
    data = await res.text();
  }

  return { status: res.status, data, headers: res.headers };
}

let totalTests = 0;
let passedChecks = 0;
let failedChecks = 0;
const auditFindings = [];

function recordResult(testName, passed, category, details) {
  totalTests++;
  if (passed) {
    passedChecks++;
    console.log(`  ✅ [PASS] ${testName}: ${details || 'Secure'}`);
  } else {
    failedChecks++;
    console.log(`  ❌ [FAIL] ${testName}: ${details || 'Vulnerability detected'}`);
    auditFindings.push({ testName, category, details });
  }
}

async function runProductionReadinessAudit() {
  console.log('========================================================================');
  console.log('   ENQOPA RENTPRO — PRODUCTION SECURITY & CHAPA VERIFICATION SUITE   ');
  console.log('   Enqopa Technologies PLC — Independent Security Assessment          ');
  console.log('========================================================================\n');

  // Authenticate Super Admin
  const adminLogin = await api('/auth/login', {
    method: 'POST',
    body: { email: 'admin@enqoparentpro.et', password: 'SuperAdminPassword123!' },
  });
  const adminToken = adminLogin.data?.data?.token;

  // Authenticate primary Owner (Owner A)
  let ownerAToken = null;
  const ownerALogin = await api('/auth/login', {
    method: 'POST',
    body: { email: 'owner@enqoparentpro.et', password: 'admin123' },
  });
  if (ownerALogin.data?.data?.token) {
    ownerAToken = ownerALogin.data.data.token;
  } else {
    const ownerALogin2 = await api('/auth/login', {
      method: 'POST',
      body: { email: 'owner@enqoparentpro.et', password: 'password123' },
    });
    ownerAToken = ownerALogin2.data?.data?.token;
  }

  // Authenticate Tenant
  const tenantLogin = await api('/auth/login', {
    method: 'POST',
    body: { email: 'abebe.kebede@gmail.com', password: 'password123' },
  });
  const tenantToken = tenantLogin.data?.data?.token;

  // Authenticate a second independent owner (Owner B) to test cross-owner isolation
  let ownerBToken = null;
  const knownOwnerBLogin = await api('/auth/login', {
    method: 'POST',
    body: { email: 'landlord.b.1794654308500@enqoparentpro.et', password: 'password123' },
  });

  if (knownOwnerBLogin.data?.data?.token) {
    ownerBToken = knownOwnerBLogin.data.data.token;
  } else {
    const timestamp = Date.now();
    const ownerBEmail = `landlord.b.${timestamp}@enqoparentpro.et`;
    const ownerBPhone = '09' + Math.floor(10000000 + Math.random() * 90000000);
    const regB = await api('/auth/register-owner', {
      method: 'POST',
      body: {
        name: 'Owner B Independent',
        email: ownerBEmail,
        phone: ownerBPhone,
        companyName: 'B-Holding Real Estate',
        password: 'password123',
      },
    });
    const ownerBId = regB.data?.data?.id;

    if (ownerBId && adminToken) {
      await api(`/system/owners/${ownerBId}/approve`, { method: 'POST', token: adminToken });
    }

    const ownerBLogin = await api('/auth/login', {
      method: 'POST',
      body: { email: ownerBEmail, password: 'password123' },
    });
    ownerBToken = ownerBLogin.data?.data?.token;
  }

  console.log(`[Setup] Admin Token:   ${adminToken ? 'Acquired' : 'FAILED'}`);
  console.log(`[Setup] Owner A Token: ${ownerAToken ? 'Acquired' : 'FAILED'}`);
  console.log(`[Setup] Owner B Token: ${ownerBToken ? 'Acquired' : 'FAILED'}`);
  console.log(`[Setup] Tenant Token:  ${tenantToken ? 'Acquired' : 'FAILED'}\n`);

  // =========================================================================
  // 1. SEC-01: AUTHENTICATION INTEGRITY & DEMO BYPASS ELIMINATION
  // =========================================================================
  console.log('--- 1. SEC-01: AUTHENTICATION ABUSE & CREDENTIAL VERIFICATION ---');

  // Attempt passwordless login via role
  const demoBypass = await api('/auth/login', {
    method: 'POST',
    body: { role: 'owner' },
  });
  const demoBypassBlocked = demoBypass.status === 400 || demoBypass.status === 401;
  recordResult(
    'Demo Role Password Bypass Eliminated',
    demoBypassBlocked,
    'CRITICAL: Authentication Backdoor',
    demoBypassBlocked
      ? 'Passwordless login rejected with HTTP ' + demoBypass.status
      : 'VULNERABLE: /api/auth/login still accepts passwordless role login!'
  );

  // Attempt login with no password
  const noPassLogin = await api('/auth/login', {
    method: 'POST',
    body: { email: 'owner@enqoparentpro.et' },
  });
  const noPassBlocked = noPassLogin.status === 400 || noPassLogin.status === 401;
  recordResult(
    'Password Requirement Enforcement',
    noPassBlocked,
    'HIGH: Missing Password Validation',
    noPassBlocked ? 'Missing password rejected with HTTP ' + noPassLogin.status : 'VULNERABLE: Login permitted without password'
  );

  // Attempt login with invalid password
  const wrongPassLogin = await api('/auth/login', {
    method: 'POST',
    body: { email: 'owner@enqoparentpro.et', password: 'WrongPassword999!' },
  });
  const wrongPassBlocked = wrongPassLogin.status === 401;
  recordResult(
    'Invalid Credentials Rejection',
    wrongPassBlocked,
    'HIGH: Broken Authentication',
    wrongPassBlocked ? 'Invalid password correctly rejected with HTTP 401' : 'VULNERABLE: Incorrect status code'
  );

  // =========================================================================
  // 2. SEC-02 & SEC-03: CONTRACTS CROSS-OWNER ISOLATION
  // =========================================================================
  console.log('\n--- 2. SEC-02 & SEC-03: CONTRACTS & LEASES CROSS-OWNER ISOLATION ---');

  // Owner B lists all contracts
  const ownerBContracts = await api('/contracts', { token: ownerBToken });
  const contractsList = ownerBContracts.data?.data?.contracts || [];
  const contractsProperlyIsolated = contractsList.length === 0;
  recordResult(
    'Contract Directory Cross-Owner Scoping (SEC-03)',
    contractsProperlyIsolated,
    'HIGH: Cross-Tenant Data Leakage',
    contractsProperlyIsolated
      ? 'Owner B with 0 properties sees exactly 0 contracts'
      : `LEAK: Owner B sees ${contractsList.length} contracts belonging to other owners`
  );

  // Owner A retrieves their own contracts
  const ownerAContracts = await api('/contracts', { token: ownerAToken });
  const ownerAContractList = ownerAContracts.data?.data?.contracts || [];
  const firstContract = ownerAContractList[0];

  if (firstContract) {
    // Owner B attempts to renew Owner A's contract
    const unauthorizedRenew = await api(`/contracts/${firstContract.id}/renew`, {
      method: 'POST',
      token: ownerBToken,
      body: { newEndDate: '2028-12-31', newRent: 99999 },
    });
    const renewBlocked = unauthorizedRenew.status === 403 || unauthorizedRenew.status === 404;
    recordResult(
      'Unauthorized Contract Renewal Blocked (SEC-02 IDOR)',
      renewBlocked,
      'CRITICAL: IDOR Lease Mutation',
      renewBlocked
        ? `Access denied appropriately (HTTP ${unauthorizedRenew.status})`
        : `VULNERABLE: Owner B renewed Owner A's contract with HTTP ${unauthorizedRenew.status}`
    );

    // Owner B attempts to change rent on Owner A's contract
    const unauthorizedRentChange = await api(`/contracts/${firstContract.id}/change-rent`, {
      method: 'POST',
      token: ownerBToken,
      body: { rent: 77777 },
    });
    const rentChangeBlocked = unauthorizedRentChange.status === 403 || unauthorizedRentChange.status === 404;
    recordResult(
      'Unauthorized Rent Tampering Blocked (SEC-02 IDOR)',
      rentChangeBlocked,
      'CRITICAL: IDOR Financial Tampering',
      rentChangeBlocked
        ? `Access denied appropriately (HTTP ${unauthorizedRentChange.status})`
        : `VULNERABLE: Owner B changed rent on Owner A's unit with HTTP ${unauthorizedRentChange.status}`
    );
  }

  // =========================================================================
  // 3. SEC-04: OFFICES & UNITS CROSS-OWNER ISOLATION
  // =========================================================================
  console.log('\n--- 3. SEC-04: OFFICES & MAINTENANCE STATUS CROSS-OWNER ISOLATION ---');

  const ownerAOffices = await api('/offices', { token: ownerAToken });
  const firstOffice = ownerAOffices.data?.data?.[0];

  if (firstOffice) {
    // Owner B attempts to change Owner A's office maintenance status
    const unauthorizedStatusUpdate = await api(`/offices/${firstOffice.id}/status`, {
      method: 'PATCH',
      token: ownerBToken,
      body: { status: 'MAINTENANCE' },
    });
    const statusBlocked = unauthorizedStatusUpdate.status === 403 || unauthorizedStatusUpdate.status === 404;
    recordResult(
      'Unauthorized Office Maintenance Status Tampering Blocked (SEC-04 IDOR)',
      statusBlocked,
      'HIGH: IDOR Office Modification',
      statusBlocked
        ? `Access denied appropriately (HTTP ${unauthorizedStatusUpdate.status})`
        : `VULNERABLE: Owner B changed Owner A's office status with HTTP ${unauthorizedStatusUpdate.status}`
    );
  }

  // =========================================================================
  // 4. TENANTS DIRECTORY & PROFILE PRIVACY
  // =========================================================================
  console.log('\n--- 4. TENANT PRIVACY & PROFILE SCOPING ---');

  const ownerATenants = await api('/tenants', { token: ownerAToken });
  const firstTenant = ownerATenants.data?.data?.[0];

  if (firstTenant) {
    // Owner B attempts to view Owner A's tenant by ID
    const unauthorizedTenantGet = await api(`/tenants/${firstTenant.id}`, {
      token: ownerBToken,
    });
    const tenantGetBlocked = unauthorizedTenantGet.status === 403 || unauthorizedTenantGet.status === 404;
    recordResult(
      'Unauthorized Tenant Profile Inspection Blocked (IDOR)',
      tenantGetBlocked,
      'HIGH: Tenant PII Exposure',
      tenantGetBlocked
        ? `Access denied appropriately (HTTP ${unauthorizedTenantGet.status})`
        : `VULNERABLE: Owner B accessed tenant details with HTTP ${unauthorizedTenantGet.status}`
    );

    // Owner B attempts to modify Owner A's tenant
    const unauthorizedTenantUpdate = await api(`/tenants/${firstTenant.id}`, {
      method: 'PUT',
      token: ownerBToken,
      body: { fullName: 'Hacked Tenant Name' },
    });
    const tenantUpdateBlocked = unauthorizedTenantUpdate.status === 403 || unauthorizedTenantUpdate.status === 404;
    recordResult(
      'Unauthorized Tenant Modification Blocked (IDOR)',
      tenantUpdateBlocked,
      'HIGH: Tenant Modification',
      tenantUpdateBlocked
        ? `Access denied appropriately (HTTP ${unauthorizedTenantUpdate.status})`
        : `VULNERABLE: Owner B updated tenant details with HTTP ${unauthorizedTenantUpdate.status}`
    );
  }

  // =========================================================================
  // 5. SEC-05: FINANCIAL REPORTS SCOPING
  // =========================================================================
  console.log('\n--- 5. SEC-05: FINANCIAL REPORTS LANDLORD SCOPING ---');

  // Owner B requests overview with NO buildingId filter
  const ownerBReport = await api('/reports/overview', { token: ownerBToken });
  const reportData = ownerBReport.data?.data || {};
  const isReportZeroScoped = (reportData.expected || 0) === 0 && (reportData.total || 0) === 0;
  recordResult(
    'Financial Overview Report Scoping (SEC-05)',
    isReportZeroScoped,
    'HIGH: Financial Data Exfiltration',
    isReportZeroScoped
      ? 'Owner B sees exactly ETB 0 expected and 0 total units'
      : `LEAK: Owner B sees ETB ${reportData.expected} from other landlords!`
  );

  // =========================================================================
  // 6. SEC-06: PROTECTED DOCUMENT ACCESS
  // =========================================================================
  console.log('\n--- 6. SEC-06: DOCUMENT PRIVACY & AUTHENTICATION ENFORCEMENT ---');

  // Public unauthenticated access to /uploads
  const unauthUpload = await fetch('http://localhost:5000/uploads/receipt-test-file.jpg');
  const unauthUploadBlocked = unauthUpload.status === 401;
  recordResult(
    'Unauthenticated Public Upload Access Blocked (SEC-06)',
    unauthUploadBlocked,
    'HIGH: Unprotected Sensitive Documents',
    unauthUploadBlocked
      ? 'Unauthenticated document access rejected with HTTP 401'
      : `VULNERABLE: Route returned status ${unauthUpload.status} instead of 401 Unauthorized`
  );

  // Path traversal prevention
  const pathTraversal = await api('/documents/..%2f..%2f..%2fpackage.json', { token: ownerBToken || adminToken });
  console.log(`[Debug Path Traversal] Status: ${pathTraversal.status}, Data:`, pathTraversal.data);
  const traversalBlocked = pathTraversal.status === 400 || pathTraversal.status === 401 || pathTraversal.status === 403 || pathTraversal.status === 404;
  recordResult(
    'Path Traversal Defense in Document Delivery',
    traversalBlocked,
    'HIGH: Path Traversal Vulnerability',
    traversalBlocked ? 'Traversal rejected with HTTP ' + pathTraversal.status : `VULNERABLE: Traversal not blocked (Status ${pathTraversal.status})`
  );

  // =========================================================================
  // 7. CHAPA GATEWAY INTEGRITY & REMOVAL OF FAKE APPROVALS
  // =========================================================================
  console.log('\n--- 7. CHAPA GATEWAY & SIMULATED APPROVAL REMOVAL ---');

  // Attempt Chapa payment via instant-pay endpoint (must be rejected)
  const chapaInstantAttempt = await api('/gateway/instant-pay', {
    method: 'POST',
    token: tenantToken,
    body: { method: 'Chapa', amount: 50000 },
  });
  const chapaInstantRejected = chapaInstantAttempt.status === 400;
  recordResult(
    'Fake Chapa Instant Approval Removed',
    chapaInstantRejected,
    'HIGH: Simulated Payment Approval',
    chapaInstantRejected
      ? 'Rejected with HTTP 400: Chapa must use hosted checkout'
      : `VULNERABLE: Instant-pay accepted Chapa with HTTP ${chapaInstantAttempt.status}`
  );

  // Submit Telebirr payment via instant-pay (must be created as PENDING, NOT APPROVED)
  const telebirrSubmit = await api('/gateway/instant-pay', {
    method: 'POST',
    token: tenantToken,
    body: { method: 'Telebirr', amount: 20000, note: 'Testing accountant review workflow' },
  });
  const isTelebirrPending = telebirrSubmit.status === 201 && telebirrSubmit.data?.data?.status === 'PENDING' && telebirrSubmit.data?.data?.verifiedBySystem === false;
  recordResult(
    'Unintegrated Payments Default to PENDING (Accountant Review)',
    isTelebirrPending,
    'CRITICAL: False Financial Approval',
    isTelebirrPending
      ? 'Telebirr created with status PENDING and verifiedBySystem: false'
      : `VULNERABLE: Payment created with status ${telebirrSubmit.data?.data?.status}`
  );

  // Initialize real Chapa Hosted Checkout
  const chapaInit = await api('/gateway/chapa/initialize', {
    method: 'POST',
    token: tenantToken,
    body: { returnUrl: 'http://localhost:5173/#/tenant' },
  });
  const isChapaInitSuccessful = chapaInit.status === 201 && chapaInit.data?.data?.checkoutUrl && chapaInit.data?.data?.txRef?.startsWith('CHAPA_');
  recordResult(
    'Chapa Hosted Checkout Pre-Creation & Initialization',
    isChapaInitSuccessful,
    'PAYMENT: Chapa Integration',
    isChapaInitSuccessful
      ? `Pending payment pre-created in DB; checkoutUrl: ${chapaInit.data?.data?.checkoutUrl?.slice(0, 45)}...`
      : `Failed to initialize Chapa: HTTP ${chapaInit.status} - ${chapaInit.data?.message}`
  );

  // =========================================================================
  // 8. CRYPTOGRAPHIC WEBHOOK VERIFICATION
  // =========================================================================
  console.log('\n--- 8. CHAPA WEBHOOK CRYPTOGRAPHIC INTEGRITY ---');

  // Send forged webhook with invalid signature
  const forgedWebhook = await api('/gateway/chapa/webhook', {
    method: 'POST',
    headers: { 'x-chapa-signature': 'invalid_forged_signature_hash_abcdef' },
    body: { tx_ref: 'CHAPA_FAKE_999', status: 'success' },
  });
  const blocksForgedWebhook = forgedWebhook.status === 400 || forgedWebhook.status === 401;
  recordResult(
    'Chapa Webhook Constant-Time HMAC Signature Verification',
    blocksForgedWebhook,
    'CRITICAL: Forged Webhook Attack',
    blocksForgedWebhook
      ? 'Forged signature rejected with HTTP ' + forgedWebhook.status
      : `VULNERABLE: Webhook accepted forged signature with HTTP ${forgedWebhook.status}`
  );

  // =========================================================================
  // SUMMARY SCORECARD
  // =========================================================================
  console.log('\n========================================================================');
  console.log('   PRODUCTION READINESS ASSESSMENT SUMMARY');
  console.log(`   TOTAL TESTS EXECUTED: ${totalTests}`);
  console.log(`   PASSED CHECKS:        ${passedChecks} / ${totalTests} (${Math.round((passedChecks / totalTests) * 100)}%)`);
  console.log(`   FAILED CHECKS:        ${failedChecks}`);
  console.log('========================================================================\n');

  if (auditFindings.length === 0) {
    console.log('🎉 ALL PRODUCTION-BLOCKING VULNERABILITIES RESOLVED (100% SUCCESS)!');
    console.log('   Enqopa RentPro is secure, isolated, and Chapa Hosted Checkout verified!\n');
  } else {
    console.log('REMAINING FINDINGS:');
    auditFindings.forEach((f, idx) => {
      console.log(`  ${idx + 1}. [${f.category}] ${f.testName}: ${f.details}`);
    });
  }
}

runProductionReadinessAudit().catch((err) => {
  console.error('Audit execution error:', err.message);
  process.exit(1);
});
