const BASE_URL = 'http://localhost:5000/api';

async function runSecurityTestSuite() {
  console.log('===============================================================');
  console.log('   ENQOPA RENTPRO — PHASE 5 SECURITY & QA TEST SUITE');
  console.log('   Enqopa Technologies PLC');
  console.log('===============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName, details = '') {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  [PASS] Test ${totalTests}: ${testName} ${details ? '(' + details + ')' : ''}`);
    } else {
      console.error(`  [FAIL] Test ${totalTests}: ${testName} ${details ? '- ' + details : ''}`);
      throw new Error(`Assertion failed: ${testName}`);
    }
  }

  // Helper fetcher
  async function api(path, options = {}) {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  // =========================================================================
  // SUITE 1: AUTHENTICATION & TOKEN HANDLING
  // =========================================================================
  console.log('\n--- SUITE 1: AUTHENTICATION & SECURE JWT HANDLING ---');

  // 1.1 Successful Super Admin login
  const adminLogin = await api('/auth/login', {
    method: 'POST',
    body: { email: 'admin@enqoparentpro.et', password: 'SuperAdminPassword123!' },
  });
  assert(adminLogin.status === 200 && adminLogin.data.data?.token, 'Super Admin login with valid credentials', 'Token received');
  const adminToken = adminLogin.data.data.token;

  // 1.2 Successful Owner login
  const ownerLogin = await api('/auth/login', {
    method: 'POST',
    body: { email: 'owner@enqoparentpro.et', password: 'admin123' },
  });
  assert(ownerLogin.status === 200 && ownerLogin.data.data?.token, 'Owner login with valid credentials', 'Token received');
  const ownerToken = ownerLogin.data.data.token;

  // 1.3 Rejection on invalid password
  const badPass = await api('/auth/login', {
    method: 'POST',
    body: { email: 'owner@enqoparentpro.et', password: 'WrongPassword999!' },
  });
  assert(badPass.status === 401, 'Rejection on invalid password (HTTP 401)', badPass.data.message);

  // 1.4 Rejection on nonexistent user
  const nonUser = await api('/auth/login', {
    method: 'POST',
    body: { email: 'ghost.user.fake@enqoparentpro.et', password: 'password123' },
  });
  assert(nonUser.status === 401, 'Rejection on nonexistent email (HTTP 401)', nonUser.data.message);

  // 1.5 Rejection on forged / corrupted token
  const forgedToken = await api('/auth/me', {
    headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.forged.signature' },
  });
  assert(forgedToken.status === 401, 'Rejection on forged JWT token (HTTP 401)', forgedToken.data.message);

  // =========================================================================
  // SUITE 2: ROLE-BASED ACCESS CONTROL (RBAC) & PERMISSION PRIVILEGES
  // =========================================================================
  console.log('\n--- SUITE 2: ROLE-BASED PERMISSION ENFORCEMENT ---');

  // 2.1 Super Admin accesses SaaS admin overview
  const adminOverview = await api('/system/overview', { token: adminToken });
  assert(adminOverview.status === 200, 'Super Admin accesses SaaS platform overview (HTTP 200)', `MRR: ETB ${adminOverview.data.data?.mrr}`);

  // 2.2 Owner blocked from SaaS platform finance ledger
  const ownerBlockedFinance = await api('/admin/finance/overview', { token: ownerToken });
  assert(ownerBlockedFinance.status === 403, 'Owner forbidden from Super Admin platform finance (HTTP 403)');

  // 2.3 Owner blocked from Gateway Credentials Management
  const ownerBlockedGateways = await api('/admin/gateways', { token: ownerToken });
  assert(ownerBlockedGateways.status === 403, 'Owner forbidden from platform payment gateway configuration (HTTP 403)');

  // 2.4 Tenant login and permission verification
  const tenantLogin = await api('/auth/login', {
    method: 'POST',
    body: { email: 'abebe.kebede@gmail.com', password: 'password123' },
  });
  assert(tenantLogin.status === 200 && tenantLogin.data.data?.token, 'Tenant authentication', 'Token received');
  const tenantToken = tenantLogin.data.data.token;

  // 2.5 Tenant blocked from building creation
  const tenantCreateBuilding = await api('/buildings', {
    method: 'POST',
    token: tenantToken,
    body: { name: 'Illegal Tenant Tower', address: 'Bole', floors: 2 },
  });
  assert(tenantCreateBuilding.status === 403, 'Tenant forbidden from creating buildings (HTTP 403)');

  // =========================================================================
  // SUITE 3: OWNER REGISTRATION & APPROVAL WORKFLOW
  // =========================================================================
  console.log('\n--- SUITE 3: OWNER REGISTRATION & SUPER ADMIN APPROVAL ---');

  const testEmail = `test.applicant.${Date.now()}@testdomain.et`;
  const regRes = await api('/auth/register-owner', {
    method: 'POST',
    body: {
      name: 'Applicant Landlord',
      email: testEmail,
      phone: '09' + Math.floor(10000000 + Math.random() * 90000000),
      companyName: 'Applicant Real Estate PLC',
      password: 'password123',
    },
  });
  assert(regRes.status === 201, 'Owner applicant registration (HTTP 201)', `Approval: ${regRes.data.data?.approvalStatus}`);
  const applicantId = regRes.data.data?.id;

  // Attempt to login as PENDING owner -> must be rejected with HTTP 403
  const pendingLogin = await api('/auth/login', {
    method: 'POST',
    body: { email: testEmail, password: 'password123' },
  });
  assert(pendingLogin.status === 403, 'Pending owner login blocked prior to approval (HTTP 403)', pendingLogin.data.message);

  // Super Admin approves the owner
  const approveRes = await api(`/system/owners/${applicantId}/approve`, {
    method: 'POST',
    token: adminToken,
  });
  assert(approveRes.status === 200, 'Super Admin approves owner account (HTTP 200)', approveRes.data.message);

  // Approved owner can now login
  const approvedLogin = await api('/auth/login', {
    method: 'POST',
    body: { email: testEmail, password: 'password123' },
  });
  assert(approvedLogin.status === 200, 'Approved owner can log in successfully (HTTP 200)', 'Access granted');

  // =========================================================================
  // SUITE 4: MULTI-TENANT DATA ISOLATION & IDOR PREVENTION
  // =========================================================================
  console.log('\n--- SUITE 4: MULTI-TENANT ISOLATION & IDOR PREVENTION ---');

  // Verify that an owner cannot read an unowned building
  const idorRead = await api('/buildings/bld_unowned_fake_9999', { token: ownerToken });
  assert(idorRead.status === 403, 'Horizontal IDOR blocked on property inspection (HTTP 403)');

  // Verify that an owner cannot update an unowned building
  const idorUpdate = await api('/buildings/bld_unowned_fake_9999', {
    method: 'PUT',
    token: ownerToken,
    body: { name: 'Hijacked Building' },
  });
  assert(idorUpdate.status === 403, 'Horizontal IDOR blocked on property mutation (HTTP 403)');

  // Verify that an owner cannot delete an unowned building
  const idorDelete = await api('/buildings/bld_unowned_fake_9999', {
    method: 'DELETE',
    token: ownerToken,
  });
  assert(idorDelete.status === 403, 'Horizontal IDOR blocked on property deletion (HTTP 403)');

  // =========================================================================
  // SUITE 5: SUBSCRIPTION LIMITS & QUOTA ENFORCEMENT
  // =========================================================================
  console.log('\n--- SUITE 5: BACKEND SUBSCRIPTION QUOTA ENFORCEMENT ---');

  // Attempt to create a building with 100 units on a 75 unit plan
  const overQuotaBuilding = await api('/buildings', {
    method: 'POST',
    token: ownerToken,
    body: {
      name: 'Exceed Quota Tower',
      address: 'Merkato, Addis Ababa',
      floors: 10,
      officesPerFloor: 15, // 150 offices > 75 plan limit
    },
  });
  assert(overQuotaBuilding.status === 403, 'Unit quota overflow blocked at backend (HTTP 403)', overQuotaBuilding.data.message);

  // =========================================================================
  // SUITE 6: PAYMENT VERIFICATION & ATOMIC TRANSACTIONS
  // =========================================================================
  console.log('\n--- SUITE 6: PAYMENT WORKFLOWS & TRANSACTION INTEGRITY ---');

  // Accountant verifies payment list
  const accountantLogin = await api('/auth/login', {
    method: 'POST',
    body: { email: 'selam.fikru@enqoparentpro.et', password: 'password123' },
  });
  const accountantToken = accountantLogin.data.data?.token;

  const pendingPayments = await api('/payments?status=pending', { token: accountantToken });
  assert(pendingPayments.status === 200, 'Accountant accesses pending payment queue', `${pendingPayments.data.data?.payments?.length || 0} items`);

  // Record a walk-in cash payment
  const tenantsList = await api('/tenants', { token: accountantToken });
  if (tenantsList.data.data?.length > 0) {
    const targetTenant = tenantsList.data.data[0];
    const cashPay = await api('/payments/manual', {
      method: 'POST',
      token: accountantToken,
      body: {
        tenantId: targetTenant.id,
        amount: 25000,
        paymentDate: '2026-09-22',
        method: 'CASH',
        txnRef: 'CASH-REC-' + Date.now().toString().slice(-6),
        note: 'Walk-in cash payment verified by accountant in office',
      },
    });
    assert(cashPay.status === 201 && cashPay.data.data?.status === 'APPROVED', 'Manual cash payment recorded with atomic transaction (HTTP 201)', `Ref: ${cashPay.data.data?.txnRef}`);
  }

  // =========================================================================
  // SUITE 7: TENANT DATA ISOLATION
  // =========================================================================
  console.log('\n--- SUITE 7: TENANT DATA ISOLATION ---');

  // Tenant retrieves their own payments
  const tenantPayments = await api('/payments', { token: tenantToken });
  assert(tenantPayments.status === 200, 'Tenant payments retrieved successfully', `${tenantPayments.data.data?.payments?.length || 0} records`);

  // Ensure all payments returned belong exclusively to this tenant
  const foreignPayments = (tenantPayments.data.data?.payments || []).filter(
    (p) => p.tenantName && p.tenantName !== 'Abebe Kebede'
  );
  assert(foreignPayments.length === 0, 'Zero cross-tenant data leakage in tenant payment endpoint');

  // =========================================================================
  // SUITE 8: ADMINISTRATIVE ACTIONS & AUDIT INTEGRITY
  // =========================================================================
  console.log('\n--- SUITE 8: ADMINISTRATIVE AUDIT TRAIL INTEGRITY ---');

  const auditRes = await api('/audit?limit=10', { token: adminToken });
  const auditLogs = Array.isArray(auditRes.data.data) ? auditRes.data.data : (auditRes.data.data?.logs || []);
  assert(auditRes.status === 200 && auditLogs.length > 0, 'Administrative audit trail accurately persisted', `${auditLogs.length} recent events audited`);

  console.log('\n===============================================================');
  console.log(`   TEST SUITE SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (100% SUCCESS)`);
  console.log('   All Security, Quota, Isolation, and Role Checks Verified!');
  console.log('===============================================================\n');
}

runSecurityTestSuite().catch((err) => {
  console.error('\n❌ Security test suite failed with error:', err.message);
  process.exit(1);
});
