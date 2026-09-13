import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { OnboardingModal } from './components/OnboardingModal';
import { PaymentModal } from './components/PaymentModal';
import { CheckBalanceModal } from './components/CheckBalanceModal';
import { ReceiveMoneyModal } from './components/ReceiveMoneyModal';
import { AddEMIModal } from './components/AddEMIModal';
import { ReceiptModal } from './components/ReceiptModal';
import { Dashboard } from './pages/Dashboard';
import { PaymentsPage } from './pages/PaymentsPage';
import { EMIPage } from './pages/EMIPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { AnalysisPage } from './pages/AnalysisPage';
import {
  fetchDashboardData,
  fetchAllAccounts,
  resetUserAccount,
} from './services/api';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeUserId, setActiveUserId] = useState('user_siddhartha');
  const [allAccounts, setAllAccounts] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal States
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isCheckBalanceOpen, setIsCheckBalanceOpen] = useState(false);
  const [preselectedContact, setPreselectedContact] = useState(null);
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [isAddEMIOpen, setIsAddEMIOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const loadData = async (targetUserId = activeUserId) => {
    try {
      setIsLoading(true);
      setError(null);

      // 1. Fetch all demo accounts list for switcher
      const accountsRes = await fetchAllAccounts();
      if (accountsRes && accountsRes.success && accountsRes.data) {
        setAllAccounts(accountsRes.data);
      }

      // 2. Fetch dashboard payload for current user
      const dashRes = await fetchDashboardData(targetUserId);
      if (dashRes && dashRes.success && (dashRes.hasAccount || dashRes.data)) {
        setDashboardData(dashRes.data);
        setIsOnboardingOpen(false);
      } else {
        setError('No active account found. Click Reset Demo to initialize.');
      }
    } catch (err) {
      console.error('[App] Failed to load financial data:', err);
      setError('Unable to communicate with the backend server. Please ensure the backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(activeUserId);
  }, [activeUserId]);

  const handleSwitchAccount = (newUserId) => {
    setActiveUserId(newUserId);
  };

  const handleReset = async () => {
    if (window.confirm('Reset demo accounts to initial state (Siddhartha: ₹50,000, Rahul: ₹30,000, default EMIs and transactions)?')) {
      try {
        setIsLoading(true);
        await resetUserAccount();
        setActiveUserId('user_siddhartha');
        await loadData('user_siddhartha');
      } catch (err) {
        console.error('Failed to reset demo:', err);
        alert('Failed to reset demo.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handlePaymentSuccess = (data) => {
    setReceiptData(data);
    setIsReceiptOpen(true);
    // Reload active user state and all accounts (so both balances refresh immediately)
    loadData(activeUserId);
  };

  const handleReceiveSuccess = (data) => {
    setReceiptData(data);
    setIsReceiptOpen(true);
    loadData(activeUserId);
  };

  const handleOpenPayment = () => {
    setPreselectedContact(null);
    setIsPaymentOpen(true);
  };

  const handleOpenPaymentWithContact = (contact) => {
    setPreselectedContact(contact);
    setIsPaymentOpen(true);
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        accountInfo={dashboardData?.account}
        user={dashboardData?.user}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {/* Header with Account Switcher & Quick Actions */}
        <Header
          user={dashboardData?.user}
          account={dashboardData?.account}
          allAccounts={allAccounts}
          activeUserId={activeUserId}
          onSwitchAccount={handleSwitchAccount}
          onReset={handleReset}
          onRefresh={() => loadData(activeUserId)}
          onOpenCheckBalance={() => setIsCheckBalanceOpen(true)}
          onOpenPayment={handleOpenPayment}
          onOpenReceive={() => setIsReceiveOpen(true)}
          onOpenAddEMI={() => setIsAddEMIOpen(true)}
          isLoading={isLoading}
        />

        {/* Loading Spinner */}
        {isLoading && !dashboardData && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            gap: '16px',
            color: 'var(--text-muted)',
          }}>
            <Loader2 size={36} className="animate-spin" color="#6366F1" />
            <div style={{ fontSize: '0.92rem', fontWeight: 500 }}>
              Connecting to Indian UPI Simulated Ledger...
            </div>
          </div>
        )}

        {/* Backend Error State */}
        {error && (
          <div className="glass-card" style={{
            borderColor: 'rgba(244, 63, 94, 0.4)',
            background: 'rgba(244, 63, 94, 0.08)',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertCircle size={22} color="#FB7185" />
              <div>
                <div style={{ fontWeight: 600, color: '#FFFFFF', fontSize: '0.92rem' }}>
                  Connection Notice
                </div>
                <div style={{ fontSize: '0.82rem', color: '#FB7185' }}>{error}</div>
              </div>
            </div>
            <button
              onClick={() => loadData(activeUserId)}
              className="btn btn-secondary"
              style={{ padding: '6px 14px', fontSize: '0.82rem' }}
            >
              <RefreshCw size={14} />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Active Page Views */}
        {dashboardData && (
          <>
            {activeTab === 'dashboard' && (
              <Dashboard
                dashboardData={dashboardData}
                onNavigateToTransactions={() => setActiveTab('transactions')}
                onOpenCheckBalance={() => setIsCheckBalanceOpen(true)}
                onOpenPayment={handleOpenPayment}
                onOpenReceive={() => setIsReceiveOpen(true)}
                onOpenAddEMI={() => setIsAddEMIOpen(true)}
                onEMIUpdated={() => loadData(activeUserId)}
              />
            )}

            {activeTab === 'payments' && (
              <PaymentsPage
                dashboardData={dashboardData}
                onOpenPaymentWithContact={handleOpenPaymentWithContact}
                onOpenPayment={handleOpenPayment}
                onOpenReceive={() => setIsReceiveOpen(true)}
                onOpenCheckBalance={() => setIsCheckBalanceOpen(true)}
              />
            )}

            {activeTab === 'emis' && (
              <EMIPage
                dashboardData={dashboardData}
                activeUserId={activeUserId}
                onOpenAddEMI={() => setIsAddEMIOpen(true)}
                onEMIUpdated={() => loadData(activeUserId)}
              />
            )}

            {activeTab === 'transactions' && (
              <TransactionsPage
                activeUserId={activeUserId}
                currency={dashboardData?.user?.currency || '₹'}
              />
            )}

            {activeTab === 'analysis' && (
              <AnalysisPage
                dashboardData={dashboardData}
                onOpenPayment={handleOpenPayment}
                onOpenCheckBalance={() => setIsCheckBalanceOpen(true)}
              />
            )}
          </>
        )}
      </main>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        currentBalance={dashboardData?.metrics?.currentBalance || 50000}
        activeUserId={activeUserId}
        currency={dashboardData?.user?.currency || '₹'}
        preselectedContact={preselectedContact}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Check Bank Balance Modal */}
      <CheckBalanceModal
        isOpen={isCheckBalanceOpen}
        onClose={() => setIsCheckBalanceOpen(false)}
        activeUserId={activeUserId}
        currency={dashboardData?.user?.currency || '₹'}
        onBalanceVerified={() => loadData(activeUserId)}
      />

      {/* Receive Money Modal */}
      <ReceiveMoneyModal
        isOpen={isReceiveOpen}
        onClose={() => setIsReceiveOpen(false)}
        activeUserId={activeUserId}
        currency={dashboardData?.user?.currency || '₹'}
        onReceiveSuccess={handleReceiveSuccess}
      />

      {/* Add EMI Modal */}
      <AddEMIModal
        isOpen={isAddEMIOpen}
        onClose={() => setIsAddEMIOpen(false)}
        activeUserId={activeUserId}
        currency={dashboardData?.user?.currency || '₹'}
        onSuccess={() => loadData(activeUserId)}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        data={receiptData}
        currency={dashboardData?.user?.currency || '₹'}
        onNavigateToTransactions={() => setActiveTab('transactions')}
      />
    </div>
  );
}

export default App;

