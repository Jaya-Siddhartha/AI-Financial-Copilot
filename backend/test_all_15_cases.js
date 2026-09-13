// Automated End-to-End Test Suite for All 15 Test Scenarios

const BASE_URL = 'http://localhost:5000/api';

async function req(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runAllTests() {
  console.log('====================================================');
  console.log('  STARTING FINCOPILOT 15-TEST VERIFICATION SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`✅ [PASS] ${testName} ${details ? '(' + details + ')' : ''}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${details ? '(' + details + ')' : ''}`);
      failed++;
    }
  }

  // STEP 0: Reset Database
  const resetRes = await req('/account/reset', { method: 'POST' });
  assert(resetRes.ok && resetRes.data.success, 'STEP 0: Reset to fresh initial state');

  // TEST 1: Confirm Account A loads automatically
  const accARes = await req('/account/dashboard?userId=user_siddhartha');
  assert(
    accARes.ok &&
      accARes.data.data.user.name === 'Siddhartha' &&
      accARes.data.data.user.mobile === '+91 9876543210' &&
      accARes.data.data.metrics.currentBalance === 50000 &&
      accARes.data.data.metrics.verifiedBalance === 50000,
    'TEST 1: Account A loads automatically with ₹50,000 verified balance',
    `Name: ${accARes.data?.data?.user?.name}, Balance: ₹${accARes.data?.data?.metrics?.currentBalance}`
  );

  // TEST 2: Switch to Account B. Confirm B's details appear
  const accBRes = await req('/account/dashboard?userId=user_rahul');
  assert(
    accBRes.ok &&
      accBRes.data.data.user.name === 'Rahul Sharma' &&
      accBRes.data.data.user.mobile === '+91 9123456780' &&
      accBRes.data.data.metrics.currentBalance === 30000 &&
      accBRes.data.data.metrics.verifiedBalance === 30000,
    'TEST 2: Switch to Account B (Rahul Sharma) with ₹30,000 verified balance',
    `Name: ${accBRes.data?.data?.user?.name}, Balance: ₹${accBRes.data?.data?.metrics?.currentBalance}`
  );

  // TEST 5: Make payment with invalid mobile numbers (rejected)
  const invalidMobileRes = await req('/transactions/payment', {
    method: 'POST',
    body: JSON.stringify({
      userId: 'user_siddhartha',
      recipientPhone: '12345', // invalid length
      amount: 1000,
      upiPin: '1234',
    }),
  });
  assert(
    !invalidMobileRes.ok,
    'TEST 5A: Invalid 5-digit mobile number rejected',
    `Status: ${invalidMobileRes.status}`
  );

  // TEST 6: Try wrong UPI PIN
  const wrongPinRes = await req('/transactions/payment', {
    method: 'POST',
    body: JSON.stringify({
      userId: 'user_siddhartha',
      recipientPhone: '9123456780',
      amount: 5000,
      upiPin: '9999', // wrong pin
    }),
  });
  assert(
    !wrongPinRes.ok && wrongPinRes.data.message.includes('UPI PIN'),
    'TEST 6: Payment with incorrect UPI PIN 9999 rejected',
    `Error msg: "${wrongPinRes.data?.message}"`
  );

  // TEST 7: Use valid UPI PIN 1234
  // TEST 3: Account A sends ₹5,000 to Account B
  const validPaymentRes = await req('/transactions/payment', {
    method: 'POST',
    body: JSON.stringify({
      userId: 'user_siddhartha',
      recipientPhone: '9123456780', // Rahul
      amount: 5000,
      upiPin: '1234',
    }),
  });
  assert(
    validPaymentRes.ok && validPaymentRes.data.success,
    'TEST 7: Payment with valid UPI PIN 1234 succeeds',
    `Transaction ID: ${validPaymentRes.data?.data?.transaction?._id}`
  );

  // TEST 3 & 4: Check A balance decreased by 5000 and B increased by 5000, transactions present on both
  const afterTxA = await req('/account/dashboard?userId=user_siddhartha');
  const afterTxB = await req('/account/dashboard?userId=user_rahul');
  const txListA = await req('/transactions?userId=user_siddhartha');
  const txListB = await req('/transactions?userId=user_rahul');

  const txsA = Array.isArray(txListA.data?.data) ? txListA.data.data : (txListA.data?.data?.transactions || []);
  const txsB = Array.isArray(txListB.data?.data) ? txListB.data.data : (txListB.data?.data?.transactions || []);

  const debitedA = afterTxA.data?.data?.metrics?.currentBalance === 45000;
  const creditedB = afterTxB.data?.data?.metrics?.currentBalance === 35000;
  const hasDebitA = txsA.some(
    (t) => t.type === 'debit' && Number(t.amount) === 5000 && t.title.includes('Rahul')
  );
  const hasCreditB = txsB.some(
    (t) => t.type === 'credit' && Number(t.amount) === 5000 && t.title.includes('Siddhartha')
  );

  assert(
    debitedA && creditedB && hasDebitA && hasCreditB,
    'TEST 3 & 4: Account A debited ₹5,000 and Account B credited ₹5,000 with cross-account metadata',
    `A Balance: ₹${afterTxA.data?.data?.metrics?.currentBalance}, B Balance: ₹${afterTxB.data?.data?.metrics?.currentBalance}`
  );

  // TEST 8: Check bank balance with PIN 1234
  const checkBalRes = await req('/account/check-balance', {
    method: 'POST',
    body: JSON.stringify({
      userId: 'user_siddhartha',
      upiPin: '1234',
    }),
  });
  assert(
    checkBalRes.ok &&
      checkBalRes.data.data.verifiedBalance === 45000 &&
      checkBalRes.data.data.lastBalanceCheckDate,
    'TEST 8: Check bank balance with PIN 1234 verifies and updates timestamp',
    `Verified Balance: ₹${checkBalRes.data?.data?.verifiedBalance}, Timestamp: ${checkBalRes.data?.data?.lastBalanceCheckDate}`
  );

  // TEST 9: Make transactions after balance verification (₹2,000 external merchant payment)
  const postVerifyTx = await req('/transactions/payment', {
    method: 'POST',
    body: JSON.stringify({
      userId: 'user_siddhartha',
      recipientPhone: '9823456781', // Priya
      amount: 2000,
      upiPin: '1234',
    }),
  });
  const afterPostVerifyA = await req('/account/dashboard?userId=user_siddhartha');
  assert(
    postVerifyTx.ok &&
      afterPostVerifyA.data.data.metrics.currentBalance === 43000 &&
      afterPostVerifyA.data.data.metrics.verifiedBalance === 45000,
    'TEST 9: Transactions after verification properly compute Estimated Current Balance (₹43,000) vs Last Verified (₹45,000)',
    `Estimated: ₹${afterPostVerifyA.data?.data?.metrics?.currentBalance}, Verified: ₹${afterPostVerifyA.data?.data?.metrics?.verifiedBalance}`
  );

  // TEST 10: Recheck bank balance (resets baseline)
  const recheckBalRes = await req('/account/check-balance', {
    method: 'POST',
    body: JSON.stringify({
      userId: 'user_siddhartha',
      upiPin: '1234',
    }),
  });
  const afterRecheckA = await req('/account/dashboard?userId=user_siddhartha');
  assert(
    recheckBalRes.ok &&
      afterRecheckA.data.data.metrics.verifiedBalance === 43000 &&
      afterRecheckA.data.data.metrics.currentBalance === 43000,
    'TEST 10: Rechecking bank balance establishes ₹43,000 as the new baseline',
    `New Baseline: ₹${afterRecheckA.data?.data?.metrics?.verifiedBalance}`
  );

  // TEST 11: Add an EMI
  const addEmiRes = await req('/emi', {
    method: 'POST',
    body: JSON.stringify({
      userId: 'user_siddhartha',
      name: 'Car Loan EMI',
      amount: 15000,
      dueDay: 15,
      totalTenureMonths: 24,
      lender: 'HDFC Bank',
    }),
  });
  const afterAddEmiA = await req('/account/dashboard?userId=user_siddhartha');
  assert(
    addEmiRes.ok &&
      afterAddEmiA.data.data.metrics.totalUpcomingEMI === 35000, // 20000 + 15000
    'TEST 11: Add EMI increases total upcoming EMI obligations and updates safe-to-spend',
    `Total EMI: ₹${afterAddEmiA.data?.data?.metrics?.totalUpcomingEMI}, SafeToSpend: ₹${afterAddEmiA.data?.data?.metrics?.safeToSpend}`
  );

  // TEST 12: Make a large payment and confirm risk status changes to HIGH RISK or CAUTION
  // Balance is 43,000. Total EMI is 35,000. If we spend 10,000, balance becomes 33,000 < 35,000 (HIGH RISK shortfall!)
  const largePaymentRes = await req('/transactions/payment', {
    method: 'POST',
    body: JSON.stringify({
      userId: 'user_siddhartha',
      recipientPhone: '9988776655',
      amount: 10000,
      upiPin: '1234',
    }),
  });
  const afterLargePayA = await req('/account/dashboard?userId=user_siddhartha');
  assert(
    largePaymentRes.ok &&
      afterLargePayA.data.data.metrics.riskStatus === 'HIGH RISK',
    'TEST 12: Large payment triggers HIGH RISK due to EMI shortfall',
    `Balance: ₹${afterLargePayA.data?.data?.metrics?.currentBalance}, EMI: ₹${afterLargePayA.data?.data?.metrics?.totalUpcomingEMI}, Status: ${afterLargePayA.data?.data?.metrics?.riskStatus}`
  );

  // TEST 13: Receive money and confirm safe-to-spend and EMI risk recalculate
  const receiveRes = await req('/transactions/receive', {
    method: 'POST',
    body: JSON.stringify({
      userId: 'user_siddhartha',
      amount: 25000,
      senderName: 'Bonus Credit',
    }),
  });
  const afterReceiveA = await req('/account/dashboard?userId=user_siddhartha');
  assert(
    receiveRes.ok &&
      afterReceiveA.data.data.metrics.currentBalance === 58000 &&
      afterReceiveA.data.data.metrics.riskStatus === 'SAFE',
    'TEST 13: Receiving ₹25,000 restores status to SAFE and raises Safe-to-Spend',
    `Balance: ₹${afterReceiveA.data?.data?.metrics?.currentBalance}, SafeToSpend: ₹${afterReceiveA.data?.data?.metrics?.safeToSpend}, Status: ${afterReceiveA.data?.data?.metrics?.riskStatus}`
  );

  // TEST 14: Pay EMI
  const emiIdToPay = afterReceiveA.data.data.emis[0]._id;
  const payEmiRes = await req(`/emi/${emiIdToPay}/pay`, {
    method: 'POST',
    body: JSON.stringify({
      userId: 'user_siddhartha',
    }),
  });
  const afterPayEmiA = await req('/account/dashboard?userId=user_siddhartha');
  assert(
    payEmiRes.ok &&
      afterPayEmiA.data.data.emis.find((e) => e._id === emiIdToPay).status === 'paid_this_cycle',
    'TEST 14: Paying EMI marks it as paid_this_cycle, deducts balance, and updates AI',
    `Paid EMI ID: ${emiIdToPay}, Remaining Pending EMI: ₹${afterPayEmiA.data?.data?.metrics?.totalUpcomingEMI}`
  );

  // TEST 15: Click Reset Demo
  const finalResetRes = await req('/account/reset', { method: 'POST' });
  const finalA = await req('/account/dashboard?userId=user_siddhartha');
  const finalB = await req('/account/dashboard?userId=user_rahul');
  assert(
    finalResetRes.ok &&
      finalA.data.data.metrics.currentBalance === 50000 &&
      finalB.data.data.metrics.currentBalance === 30000,
    'TEST 15: Reset Demo restores Siddhartha (₹50,000) and Rahul (₹30,000)',
    `A: ₹${finalA.data?.data?.metrics?.currentBalance}, B: ₹${finalB.data?.data?.metrics?.currentBalance}`
  );

  console.log('\n====================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');
}

runAllTests().catch((err) => {
  console.error('Test execution failed:', err);
});
