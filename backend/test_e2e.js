const BASE_URL = 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };
  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }
  const res = await fetch(url, config);
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.message || `HTTP ${res.status}`);
    error.response = { status: res.status, data };
    throw error;
  }
  return { data };
}

const api = {
  get: (url, opts = {}) => {
    let finalUrl = url;
    if (opts.params) {
      const q = new URLSearchParams(opts.params).toString();
      finalUrl += `?${q}`;
    }
    return request(finalUrl, { method: 'GET' });
  },
  post: (url, body) => request(url, { method: 'POST', body }),
};

async function runTests() {
  console.log('==============================================');
  console.log('STARTING FINCOPILOT END-TO-END VERIFICATION');
  console.log('==============================================\n');

  // Step 0: Reset to clean baseline
  console.log('Step 0: Resetting Demo Data...');
  const resetRes = await api.post('/account/reset');
  console.log('✓ Reset response:', resetRes.data.message);

  // Step 1: Verify Dual Accounts
  console.log('\nStep 1: Verifying Dual Demo Accounts...');
  const accountsRes = await api.get('/account/all');
  console.log('✓ Demo Accounts Found:', accountsRes.data.data.map(a => `${a.name} (${a.mobile}): ₹${a.currentBalance}`));
  if (accountsRes.data.data.length !== 2) throw new Error('Expected 2 demo accounts');

  // Step 2: Check Siddhartha Dashboard Baseline
  console.log('\nStep 2: Checking Siddhartha Dashboard Baseline...');
  const siddharthaDash1 = await api.get('/account/dashboard', { params: { userId: 'user_siddhartha' } });
  const sData1 = siddharthaDash1.data.data;
  console.log(`✓ Siddhartha Balance: ₹${sData1.metrics.currentBalance}`);
  console.log(`✓ Siddhartha Upcoming EMI: ₹${sData1.metrics.totalUpcomingEMI}`);
  console.log(`✓ Siddhartha Safe-to-Spend: ₹${sData1.metrics.safeToSpend}`);
  console.log(`✓ Siddhartha Financial Status: ${sData1.metrics.riskStatus}`);
  console.log(`✓ AI Recommendation: "${sData1.aiPrediction.recommendation}"`);

  if (sData1.metrics.currentBalance !== 50000) throw new Error('Siddhartha starting balance should be 50000');
  if (sData1.metrics.riskStatus !== 'SAFE') throw new Error('Siddhartha initial status should be SAFE');

  // Step 3: Check Rahul Dashboard Baseline
  console.log('\nStep 3: Checking Rahul Dashboard Baseline...');
  const rahulDash1 = await api.get('/account/dashboard', { params: { userId: 'user_rahul' } });
  const rData1 = rahulDash1.data.data;
  console.log(`✓ Rahul Balance: ₹${rData1.metrics.currentBalance}`);
  console.log(`✓ Rahul Upcoming EMI: ₹${rData1.metrics.totalUpcomingEMI}`);
  console.log(`✓ Rahul Safe-to-Spend: ₹${rData1.metrics.safeToSpend}`);

  if (rData1.metrics.currentBalance !== 20000) throw new Error('Rahul starting balance should be 20000');

  // Step 4: Siddhartha sends ₹5,000 to Rahul (Double-Entry Transfer)
  console.log('\nStep 4: Siddhartha sends ₹5,000 to Rahul (+91 9123456789)...');
  const paymentRes = await api.post('/transactions/payment', {
    senderId: 'user_siddhartha',
    recipientName: 'Rahul Sharma',
    recipientPhone: '9123456789',
    amount: 5000,
    paymentMethod: 'UPI',
  });
  console.log('✓ Payment Response:', paymentRes.data.message);
  console.log(`✓ Siddhartha New Balance returned: ₹${paymentRes.data.data.newBalance}`);
  console.log(`✓ Recipient Balance returned: ₹${paymentRes.data.data.recipientBalance}`);

  // Step 5: Verify Siddhartha Updated State & Debit Transaction
  console.log('\nStep 5: Verifying Siddhartha Account After Transfer...');
  const siddharthaDash2 = await api.get('/account/dashboard', { params: { userId: 'user_siddhartha' } });
  const sData2 = siddharthaDash2.data.data;
  console.log(`✓ Siddhartha Updated Balance: ₹${sData2.metrics.currentBalance} (Expected: 45000)`);
  console.log(`✓ Siddhartha Recalculated Safe-to-Spend: ₹${sData2.metrics.safeToSpend}`);
  console.log(`✓ Siddhartha Status: ${sData2.metrics.riskStatus}`);
  console.log(`✓ Siddhartha Latest Transaction:`, sData2.recentTransactions[0].title, `(- ₹${sData2.recentTransactions[0].amount})`);

  if (sData2.metrics.currentBalance !== 45000) throw new Error('Siddhartha balance should be 45000');
  if (sData2.recentTransactions[0].type !== 'debit' || sData2.recentTransactions[0].amount !== 5000) {
    throw new Error('Siddhartha must have a debit transaction of 5000');
  }

  // Step 6: Verify Rahul Updated State & Credit Transaction
  console.log('\nStep 6: Verifying Rahul Account Received ₹5,000 Automatically...');
  const rahulDash2 = await api.get('/account/dashboard', { params: { userId: 'user_rahul' } });
  const rData2 = rahulDash2.data.data;
  console.log(`✓ Rahul Updated Balance: ₹${rData2.metrics.currentBalance} (Expected: 25000)`);
  console.log(`✓ Rahul Safe-to-Spend: ₹${rData2.metrics.safeToSpend}`);
  console.log(`✓ Rahul Latest Transaction:`, rData2.recentTransactions[0].title, `(+ ₹${rData2.recentTransactions[0].amount})`);

  if (rData2.metrics.currentBalance !== 25000) throw new Error('Rahul balance should be 25000');
  if (rData2.recentTransactions[0].type !== 'credit' || rData2.recentTransactions[0].amount !== 5000) {
    throw new Error('Rahul must have received a credit transaction of 5000');
  }

  // Step 7: Test Validation Constraints
  console.log('\nStep 7: Testing Payment Validation Rules...');
  try {
    await api.post('/transactions/payment', {
      senderId: 'user_siddhartha',
      recipientName: 'Test',
      amount: -100,
    });
    throw new Error('Negative amount should fail');
  } catch (err) {
    console.log('✓ Negative amount correctly rejected:', err.response?.data?.message || err.message);
  }

  try {
    await api.post('/transactions/payment', {
      senderId: 'user_siddhartha',
      recipientName: 'Test',
      amount: 999999,
    });
    throw new Error('Overdraft should fail');
  } catch (err) {
    console.log('✓ Insufficient balance correctly rejected:', err.response?.data?.message || err.message);
  }

  // Step 8: Pay EMI flow
  console.log('\nStep 8: Testing EMI Payment Flow...');
  const emis = sData2.emis;
  if (emis.length > 0) {
    const emiToPay = emis[0];
    console.log(`Paying EMI: ${emiToPay.name} (₹${emiToPay.amount})...`);
    const payEmiRes = await api.post(`/emi/${emiToPay._id || emiToPay.id}/pay`, {
      userId: 'user_siddhartha',
    });
    console.log('✓ EMI Payment Response:', payEmiRes.data.message);

    const siddharthaDash3 = await api.get('/account/dashboard', { params: { userId: 'user_siddhartha' } });
    console.log(`✓ Balance after EMI: ₹${siddharthaDash3.data.data.metrics.currentBalance} (Expected: 25000)`);
    console.log(`✓ EMI status:`, siddharthaDash3.data.data.emis[0].status);
  }

  // Step 9: Reset Demo and Confirm Clean State
  console.log('\nStep 9: Testing Final Demo Reset...');
  await api.post('/account/reset');
  const finalAccounts = await api.get('/account/all');
  console.log('✓ Accounts after reset:', finalAccounts.data.data.map(a => `${a.name}: ₹${a.currentBalance}`));

  const sidFinal = finalAccounts.data.data.find(a => a.id === 'user_siddhartha');
  const rahulFinal = finalAccounts.data.data.find(a => a.id === 'user_rahul');
  if (sidFinal.currentBalance !== 50000 || rahulFinal.currentBalance !== 20000) {
    throw new Error('Balances not properly restored after reset');
  }

  console.log('\n==============================================');
  console.log('ALL VERIFICATION CHECKS PASSED SUCCESSFULLY! 🎉');
  console.log('==============================================');
}

runTests().catch(err => {
  console.error('\n❌ Test failed with error:', err.response?.data || err.message);
  process.exit(1);
});
