import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  ChevronDown,
  History,
  House,
  LoaderCircle,
  PieChart,
  RefreshCw,
  Send,
  User,
} from 'lucide-react';
import { Avatar } from './components/ui/Avatar';
import { Alert } from './components/ui/Alert';
import { HomePage } from './pages/HomePage';
import { InsightsPage } from './pages/InsightsPage';
import { EmisPage } from './pages/EmisPage';
import { HistoryPage } from './pages/HistoryPage';
import { ProfilePage } from './pages/ProfilePage';
import { PayFlow } from './flows/PayFlow';
import { CheckBalanceFlow } from './flows/CheckBalanceFlow';
import { ChangePinFlow } from './flows/ChangePinFlow';
import { ReceiveSheet } from './flows/ReceiveSheet';
import { AddEmiSheet } from './flows/AddEmiSheet';
import { PayEmiSheet } from './flows/PayEmiSheet';
import { TransactionSheet } from './flows/TransactionSheet';
import { ConfirmSheet } from './flows/ConfirmSheet';
import { deleteEMIApi, fetchAllAccounts, fetchDashboardData, resetDemo } from './services/api';
import { DEMO_CONTACTS } from './constants/contacts';
import { apiError } from './lib/format';
import { useSettings } from './lib/settings';
import { stopSpeaking } from './lib/speech';

const DEFAULT_USER = 'user_siddhartha';
const USER_KEY = 'fincopilot.activeUser';

const NAV = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'insights', label: 'Insights', icon: PieChart },
  { id: 'emis', label: 'EMIs', icon: CalendarClock },
  { id: 'history', label: 'History', icon: History },
  { id: 'profile', label: 'Profile', icon: User },
];
// Phones: four tabs around a central Pay button. History is one tap away from Home and Profile.
const BOTTOM_NAV = ['home', 'insights', 'emis', 'profile'].map((id) => NAV.find((n) => n.id === id));

// The open tab lives in the URL hash (#insights), so Back works and pages can be linked to.
const tabFromHash = () => {
  const id = window.location.hash.replace('#', '');
  return NAV.some((n) => n.id === id) ? id : 'home';
};

const readStoredUser = () => {
  try {
    return localStorage.getItem(USER_KEY) || DEFAULT_USER;
  } catch {
    return DEFAULT_USER;
  }
};

export default function App() {
  const [tab, setTab] = useState(tabFromHash);
  const [userId, setUserId] = useState(readStoredUser);
  const [accounts, setAccounts] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sheet, setSheet] = useState(null);
  const [toast, setToast] = useState('');
  const [historyKey, setHistoryKey] = useState(0);
  const [settings, setSettings] = useSettings();

  const load = useCallback(async (targetUserId) => {
    setLoading(true);
    setError('');
    try {
      const [accountsRes, dashRes] = await Promise.all([fetchAllAccounts(), fetchDashboardData(targetUserId)]);
      setAccounts(accountsRes.data || []);
      setData(dashRes.data);
      // The stored account may no longer exist (e.g. after a reset); follow what the server returned.
      if (dashRes.data?.user?.id && dashRes.data.user.id !== targetUserId) setUserId(dashRes.data.user.id);
    } catch (err) {
      setError(apiError(err, 'Could not load your account.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(userId);
    try {
      localStorage.setItem(USER_KEY, userId);
    } catch {
      // Storage can be unavailable (private mode); the app works without it.
    }
  }, [userId, load]);

  useEffect(() => {
    const onHash = () => {
      stopSpeaking();
      setTab(tabFromHash());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const refresh = useCallback(() => {
    setHistoryKey((k) => k + 1);
    return load(userId);
  }, [load, userId]);

  const closeSheet = useCallback(() => setSheet(null), []);

  // Other demo account first, then fixed demo contacts.
  const contacts = useMemo(() => {
    const others = accounts
      .filter((a) => a.id !== userId)
      .map((a) => ({ name: a.fullName || a.name, phone: a.phoneOnly, upiId: a.upiId }));
    return [...others, ...DEMO_CONTACTS];
  }, [accounts, userId]);

  const go = (next) => {
    if (next === tab) {
      window.scrollTo({ top: 0 });
      return;
    }
    if (next === 'home') {
      // A clean URL for Home; pushState does not fire 'hashchange', so switch here.
      window.history.pushState(null, '', window.location.pathname + window.location.search);
      stopSpeaking();
      setTab('home');
      window.scrollTo({ top: 0 });
    } else {
      // Setting the hash fires 'hashchange', which switches the tab.
      window.location.hash = next;
    }
  };

  const actions = {
    go,
    notify: setToast,
    setSettings,
    pay: (payee = null, mode) => setSheet({ type: 'pay', payee, mode }),
    checkBalance: () => setSheet({ type: 'balance' }),
    receive: () => setSheet({ type: 'receive' }),
    addEmi: () => setSheet({ type: 'addEmi' }),
    payEmi: (emi) => setSheet({ type: 'payEmi', emi }),
    openTx: (tx) => setSheet({ type: 'tx', tx }),
    changePin: () => setSheet({ type: 'changePin' }),
    switchAccount: (id) => {
      if (id === userId) return;
      setUserId(id);
      setToast('Switched account');
    },
    removeEmi: (emi) =>
      setSheet({
        type: 'confirm',
        title: 'Remove EMI?',
        message: `${emi.name} will no longer be counted when working out what is safe to spend.`,
        confirmLabel: 'Remove',
        danger: true,
        onConfirm: async () => {
          await deleteEMIApi(emi._id || emi.id, userId);
          setSheet(null);
          setToast(`${emi.name} removed`);
          refresh();
        },
      }),
    reset: () =>
      setSheet({
        type: 'confirm',
        title: 'Reset demo data?',
        message: 'Both demo accounts go back to their starting balances, EMIs and transactions. The UPI PIN is reset to 1234.',
        confirmLabel: 'Reset',
        danger: true,
        onConfirm: async () => {
          await resetDemo();
          setSheet(null);
          setToast('Demo data reset');
          if (userId === DEFAULT_USER) refresh();
          else setUserId(DEFAULT_USER);
          go('home');
        },
      }),
  };

  const renderSheet = () => {
    if (!sheet || !data) return null;
    const common = { user: data.user, account: data.account, onClose: closeSheet };
    switch (sheet.type) {
      case 'pay':
        return (
          <PayFlow
            {...common}
            contacts={contacts}
            initialPayee={sheet.payee}
            mode={sheet.mode}
            metrics={data.metrics}
            onPaid={refresh}
            onViewHistory={() => {
              closeSheet();
              go('history');
            }}
          />
        );
      case 'balance':
        return <CheckBalanceFlow {...common} onVerified={refresh} />;
      case 'changePin':
        return <ChangePinFlow {...common} />;
      case 'receive':
        return <ReceiveSheet {...common} onReceived={refresh} notify={setToast} />;
      case 'addEmi':
        return (
          <AddEmiSheet
            {...common}
            onSaved={(message) => {
              closeSheet();
              setToast(message);
              refresh();
            }}
          />
        );
      case 'payEmi':
        return <PayEmiSheet {...common} emi={sheet.emi} balance={data.metrics.currentBalance} onPaid={refresh} />;
      case 'tx':
        return (
          <TransactionSheet
            tx={sheet.tx}
            onClose={closeSheet}
            onUpdated={() => {
              setToast('Category updated');
              refresh();
            }}
          />
        );
      case 'confirm':
        return <ConfirmSheet {...sheet} onClose={closeSheet} />;
      default:
        return null;
    }
  };

  const renderPage = () => {
    if (!data) {
      return error ? (
        <div className="page narrow">
          <Alert>{error}</Alert>
          <button type="button" className="btn btn-primary" onClick={() => load(userId)}>
            Try again
          </button>
        </div>
      ) : (
        <div className="loading" role="status">
          <LoaderCircle size={32} className="spin text-accent" />
          <span>Loading your account…</span>
        </div>
      );
    }

    switch (tab) {
      case 'insights':
        return <InsightsPage data={data} />;
      case 'emis':
        return <EmisPage data={data} actions={actions} />;
      case 'history':
        return <HistoryPage userId={data.user.id} refreshKey={historyKey} actions={actions} />;
      case 'profile':
        return <ProfilePage data={data} accounts={accounts} activeUserId={data.user.id} actions={actions} settings={settings} />;
      default:
        return <HomePage data={data} actions={actions} settings={settings} />;
    }
  };

  const user = data?.user;

  return (
    <>
      <header className="topbar">
        <button type="button" className="topbar-brand" onClick={() => go('home')} aria-label="FinCopilot home">
          <span className="brand-mark" aria-hidden="true">F</span>
          <span className="brand-name">FINCOPILOT</span>
          <span className="brand-tag" aria-hidden="true">/UPI</span>
        </button>
        <div className="topbar-actions">
          <button type="button" className="topbar-icon" onClick={refresh} aria-label="Refresh" disabled={loading}>
            <RefreshCw size={20} className={loading ? 'spin' : ''} />
          </button>
          {user && (
            <button type="button" className="topbar-profile" onClick={() => go('profile')} aria-label={`${user.name}: open profile and settings`}>
              <Avatar name={user.fullName || user.name} size={36} />
              <span className="topbar-who">
                <span className="topbar-name">
                  {user.name} <ChevronDown size={16} aria-hidden="true" />
                </span>
                <span className="topbar-sub">{user.upiId}</span>
              </span>
            </button>
          )}
        </div>
      </header>

      <div className="shell">
        <nav className="sidebar" aria-label="Main">
          <button type="button" className="btn btn-primary sidebar-pay" onClick={() => actions.pay()} disabled={!data}>
            <Send size={20} /> Send money
          </button>
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`sidebar-item ${tab === id ? 'active' : ''}`}
              onClick={() => go(id)}
              aria-current={tab === id ? 'page' : undefined}
            >
              <Icon size={22} strokeWidth={1.8} />
              {label}
            </button>
          ))}
          <div className="sidebar-foot">DEMO · PRETEND UPI PAYMENTS</div>
        </nav>

        <main className="main">{renderPage()}</main>
      </div>

      <nav className="bottomnav" aria-label="Main">
        {BOTTOM_NAV.slice(0, 2).map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" className={`bottomnav-item ${tab === id ? 'active' : ''}`} onClick={() => go(id)} aria-current={tab === id ? 'page' : undefined}>
            <Icon size={24} strokeWidth={1.8} />
            {label}
          </button>
        ))}
        <button type="button" className="bottomnav-item" onClick={() => actions.pay()} disabled={!data}>
          <span className="bottomnav-pay">
            <Send size={24} />
          </span>
          Pay
        </button>
        {BOTTOM_NAV.slice(2, 4).map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" className={`bottomnav-item ${tab === id ? 'active' : ''}`} onClick={() => go(id)} aria-current={tab === id ? 'page' : undefined}>
            <Icon size={24} strokeWidth={1.8} />
            {label}
          </button>
        ))}
      </nav>

      {renderSheet()}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </>
  );
}
