import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, CalendarClock, Gauge, History, House, LoaderCircle, PieChart, Plus, RefreshCw, Settings } from 'lucide-react';
import { Avatar } from './components/ui/Avatar';
import { Alert } from './components/ui/Alert';
import { OnboardingPage } from './pages/OnboardingPage';
import { HomePage } from './pages/HomePage';
import { ActivityPage } from './pages/ActivityPage';
import { InsightsPage } from './pages/InsightsPage';
import { EmisPage } from './pages/EmisPage';
import { AssistantPage } from './pages/AssistantPage';
import { SettingsPage } from './pages/SettingsPage';
import { CreditPage } from './pages/CreditPage';
import { TransactionSheet } from './flows/TransactionSheet';
import { EmiSheet } from './flows/EmiSheet';
import { PayEmiSheet } from './flows/PayEmiSheet';
import { BalanceSheet } from './flows/BalanceSheet';
import { UploadSheet } from './flows/UploadSheet';
import { ConfirmSheet } from './flows/ConfirmSheet';
import { CreditScoreSheet } from './flows/CreditScoreSheet';
import { GoalSheet } from './flows/GoalSheet';
import * as store from './data/store';
import { analyze, autopayDue, missedDueDates, parseDay } from './lib/engine';
import { estimateCreditHealth } from './lib/creditScore';
import { CATEGORIES } from './lib/categories';
import { errorText, inr } from './lib/format';
import { applyDisplay } from './lib/settings';
import { stopSpeaking } from './lib/speech';

const NAV = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'activity', label: 'History', icon: History },
  { id: 'insights', label: 'Insights', icon: PieChart },
  { id: 'emis', label: 'EMIs', icon: CalendarClock },
  { id: 'credit', label: 'Credit score', icon: Gauge },
  { id: 'assistant', label: 'Ask AI', icon: Bot },
  { id: 'settings', label: 'Settings', icon: Settings },
];
const BOTTOM = ['home', 'insights', 'emis', 'activity'].map((id) => NAV.find((n) => n.id === id));

// One EMI fewer to go; stays unknown (null) if the months left were never set.
const monthsLeftAfterPaying = (emi) => {
  const left = Number(emi.remainingMonths);
  return emi.remainingMonths === null || emi.remainingMonths === undefined || emi.remainingMonths === '' || Number.isNaN(left) ? null : Math.max(0, left - 1);
};

// '#calculator' opens the EMIs page on its calculator.
const tabFromHash = () => {
  const id = window.location.hash.replace('#', '');
  if (id === 'calculator') return 'calculator';
  return NAV.some((n) => n.id === id) ? id : 'home';
};

let tmpCounter = 0;
const tmpId = () => `tmp-${Date.now()}-${tmpCounter++}`;

export default function App() {
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState(tabFromHash);
  const [sheet, setSheet] = useState(null);
  const [toast, setToast] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const autopayRan = useRef(false);

  // ---------- data (saved on this device) ----------
  const load = useCallback(async () => {
    setLoadError('');
    setSyncing(true);
    try {
      const everything = await store.loadEverything();
      setData(everything);
      applyDisplay({ theme: everything.profile.theme, textSize: everything.profile.textSize });
    } catch (err) {
      setLoadError(errorText(err, 'Could not load your data.'));
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
    const t = setTimeout(() => setToast(null), toast.long ? 5000 : 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const notify = useCallback((text, tone = 'ok', long = false) => setToast({ text, tone, long }), []);
  const fail = useCallback((err, fallback) => notify(errorText(err, fallback), 'error', true), [notify]);

  // ---------- derived numbers (computed on the device, instantly) ----------
  const engineInput = useMemo(
    () => (data ? { profile: data.profile, transactions: data.transactions, emis: data.emis } : null),
    [data]
  );
  const analysis = useMemo(() => (engineInput ? analyze(engineInput) : null), [engineInput]);
  const credit = useMemo(
    () => (analysis ? estimateCreditHealth({ analysis, transactions: data.transactions, profile: data.profile }) : null),
    [analysis, data]
  );

  // ---------- writes: update the screen first, then save; undo if saving fails ----------
  const patchData = (fn) => setData((d) => (d ? fn(d) : d));
  const sortTx = (list) => [...list].sort((a, b) => new Date(b.date) - new Date(a.date));

  const actions = useMemo(() => {
    const go = (next) => {
      stopSpeaking();
      if (next === tab) return window.scrollTo({ top: 0 });
      if (next === 'home') {
        window.history.pushState(null, '', window.location.pathname + window.location.search);
        setTab('home');
        window.scrollTo({ top: 0 });
      } else window.location.hash = next;
      return undefined;
    };

    const addTransaction = async (tx) => {
      const temp = { ...tx, id: tmpId() };
      patchData((d) => ({ ...d, transactions: sortTx([temp, ...d.transactions]) }));
      try {
        const [saved] = await store.addTransactions([tx]);
        patchData((d) => ({ ...d, transactions: d.transactions.map((t) => (t.id === temp.id ? saved : t)) }));
        return saved;
      } catch (err) {
        patchData((d) => ({ ...d, transactions: d.transactions.filter((t) => t.id !== temp.id) }));
        throw err;
      }
    };

    const updateTransaction = async (tx) => {
      let before;
      patchData((d) => {
        before = d.transactions.find((t) => t.id === tx.id);
        return { ...d, transactions: sortTx(d.transactions.map((t) => (t.id === tx.id ? tx : t))) };
      });
      try {
        const saved = await store.updateTransaction(tx.id, tx);
        patchData((d) => ({ ...d, transactions: d.transactions.map((t) => (t.id === tx.id ? saved : t)) }));
      } catch (err) {
        patchData((d) => ({ ...d, transactions: sortTx(d.transactions.map((t) => (t.id === tx.id ? before : t))) }));
        throw err;
      }
    };

    const deleteTransaction = async (tx) => {
      patchData((d) => ({ ...d, transactions: d.transactions.filter((t) => t.id !== tx.id) }));
      try {
        await store.deleteTransaction(tx.id);
      } catch (err) {
        patchData((d) => ({ ...d, transactions: sortTx([tx, ...d.transactions]) }));
        throw err;
      }
    };

    const saveProfile = async (patch) => {
      let before;
      patchData((d) => {
        before = d.profile;
        return { ...d, profile: { ...d.profile, ...patch } };
      });
      if ('theme' in patch || 'textSize' in patch) applyDisplay({ theme: patch.theme ?? before?.theme, textSize: patch.textSize ?? before?.textSize });
      try {
        const saved = await store.updateProfile(patch);
        patchData((d) => ({ ...d, profile: saved }));
      } catch (err) {
        patchData((d) => ({ ...d, profile: before }));
        if (before) applyDisplay(before);
        throw err;
      }
    };

    const saveEmi = async (emi) => {
      if (emi.id) {
        let before;
        patchData((d) => {
          before = d.emis.find((e) => e.id === emi.id);
          return { ...d, emis: d.emis.map((e) => (e.id === emi.id ? { ...e, ...emi } : e)) };
        });
        try {
          const saved = await store.updateEmi(emi.id, emi);
          patchData((d) => ({ ...d, emis: d.emis.map((e) => (e.id === emi.id ? saved : e)) }));
          return saved;
        } catch (err) {
          patchData((d) => ({ ...d, emis: d.emis.map((e) => (e.id === emi.id ? before : e)) }));
          throw err;
        }
      }
      const temp = { ...emi, id: tmpId(), createdAt: new Date().toISOString() };
      patchData((d) => ({ ...d, emis: [...d.emis, temp] }));
      try {
        const saved = await store.addEmi(emi);
        patchData((d) => ({ ...d, emis: d.emis.map((e) => (e.id === temp.id ? saved : e)) }));
        return saved;
      } catch (err) {
        patchData((d) => ({ ...d, emis: d.emis.filter((e) => e.id !== temp.id) }));
        throw err;
      }
    };

    const deleteEmi = async (emi) => {
      patchData((d) => ({ ...d, emis: d.emis.filter((e) => e.id !== emi.id) }));
      try {
        await store.deleteEmi(emi.id);
      } catch (err) {
        patchData((d) => ({ ...d, emis: [...d.emis, emi] }));
        throw err;
      }
    };

    // Records an EMI payment: a debit in the history, and the EMI marked paid for its due date.
    const recordEmiPayment = async (emi, { autopay = false, date } = {}) => {
      const when = date || new Date().toISOString();
      await addTransaction({
        date: when,
        description: `${autopay ? 'Autopay: ' : ''}${emi.name} EMI${emi.lender ? ` (${emi.lender})` : ''}`,
        amount: Number(emi.amount),
        type: 'debit',
        category: CATEGORIES.EMI,
        source: autopay ? 'autopay' : 'manual',
        emiId: emi.id,
      });
      await saveEmi({
        id: emi.id,
        paidThroughDate: emi.coversDueDate,
        lastPaidDate: new Date().toISOString(),
        remainingMonths: monthsLeftAfterPaying(emi),
      });
    };

    const importStatements = async (items) => {
      let count = 0;
      for (const item of items) {
        const { statement, transactions } = await store.saveStatement(item);
        count += transactions.length;
        patchData((d) => ({ ...d, statements: [statement, ...d.statements], transactions: sortTx([...transactions, ...d.transactions]) }));
      }
      return count;
    };

    const removeStatement = async (statement, withTransactions) => {
      await store.deleteStatement(statement, { withTransactions });
      patchData((d) => ({
        ...d,
        statements: d.statements.filter((s) => s.id !== statement.id),
        transactions: withTransactions
          ? d.transactions.filter((t) => t.statementId !== statement.id)
          : d.transactions.map((t) => (t.statementId === statement.id ? { ...t, statementId: null } : t)),
      }));
    };

    const confirm = (opts) => setSheet({ type: 'confirm', ...opts });

    const addCreditScore = async (entry) => {
      const saved = await store.addCreditScore(entry);
      patchData((d) => ({ ...d, creditScores: [saved, ...d.creditScores].sort((a, b) => b.date.localeCompare(a.date)) }));
      return saved;
    };
    const deleteCreditScore = async (entry) => {
      await store.deleteCreditScore(entry.id);
      patchData((d) => ({ ...d, creditScores: d.creditScores.filter((c) => c.id !== entry.id) }));
    };
    const saveGoal = async (goal) => {
      const saved = await store.saveGoal(goal);
      patchData((d) => ({ ...d, goals: goal.id ? d.goals.map((g) => (g.id === saved.id ? saved : g)) : [...d.goals, saved] }));
      return saved;
    };
    const deleteGoal = async (goal) => {
      await store.deleteGoal(goal.id);
      patchData((d) => ({ ...d, goals: d.goals.filter((g) => g.id !== goal.id) }));
    };

    return {
      go,
      notify,
      fail,
      reload: load,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      saveProfile,
      saveEmi,
      deleteEmi,
      recordEmiPayment,
      importStatements,
      removeStatement,
      confirm,
      addCreditScore,
      deleteCreditScore,
      saveGoal,
      deleteGoal,
      addScore: () => setSheet({ type: 'score' }),
      editGoal: (goal = null) => setSheet({ type: 'goal', goal }),
      loadSample: async () => {
        await store.loadSampleData();
        autopayRan.current = false;
        await load();
      },
      openTx: (tx) => setSheet({ type: 'tx', tx }),
      newTx: (type = 'debit') => setSheet({ type: 'tx', tx: null, txType: type }),
      editEmi: (emi = null, prefill = null) => setSheet({ type: 'emi', emi, prefill }),
      payEmi: (emi) => setSheet({ type: 'payEmi', emi }),
      updateBalance: () => setSheet({ type: 'balance' }),
      upload: () => setSheet({ type: 'upload' }),
      closeSheet: () => setSheet(null),
      exportBackup: store.exportBackup,
      importBackup: async (text) => {
        const result = await store.importBackup(text);
        autopayRan.current = false;
        await load();
        return result;
      },
      deleteAllData: async () => {
        await store.deleteAllData();
        autopayRan.current = false;
        window.location.hash = '';
        await load();
      },
    };
  }, [tab, load, notify, fail]);

  // ---------- autopay: record EMIs whose due date has arrived (once per visit) ----------
  useEffect(() => {
    if (!data || !analysis || autopayRan.current) return;
    autopayRan.current = true;
    const due = autopayDue(data.emis);
    if (!due.length) return;
    (async () => {
      const done = [];
      for (const first of due) {
        // Record every missed month (up to a year) after a long gap, oldest first, not just the latest.
        let emi = first;
        let count = 0;
        for (const day of missedDueDates(first)) {
          try {
            await actions.recordEmiPayment({ ...emi, coversDueDate: day }, { autopay: true, date: parseDay(day).toISOString() });
            count += 1;
            emi = { ...emi, paidThroughDate: day, remainingMonths: monthsLeftAfterPaying(emi) };
          } catch (err) {
            fail(err, `Autopay for ${emi.name} could not be recorded.`);
            break;
          }
        }
        if (count) done.push(`${first.name} ${inr(first.amount)}${count > 1 ? ` × ${count} months` : ''}`);
      }
      if (done.length) notify(`Autopay recorded: ${done.join(', ')}`, 'ok', true);
    })();
  }, [data, analysis, actions, notify, fail]);

  // ---------- screens ----------
  if (!data) {
    return (
      <div className="loading" role="status">
        {loadError ? (
          <div className="page narrow" style={{ width: '100%' }}>
            <Alert>{loadError}</Alert>
            <div className="btn-row" style={{ marginTop: 12 }}>
              <button type="button" className="btn btn-primary" onClick={load}>Try again</button>
            </div>
          </div>
        ) : (
          <>
            <LoaderCircle size={32} className="spin text-accent" />
            <span>Opening FinCopilot…</span>
          </>
        )}
      </div>
    );
  }

  if (!data.profile.onboarded) {
    return <OnboardingPage profile={data.profile} actions={actions} />;
  }

  const ctx = { data, analysis, credit, engineInput, actions };
  const pages = {
    home: <HomePage {...ctx} />,
    activity: <ActivityPage {...ctx} />,
    insights: <InsightsPage {...ctx} />,
    emis: <EmisPage key="list" {...ctx} />,
    calculator: <EmisPage key="calc" {...ctx} initialView="calc" />,
    credit: <CreditPage {...ctx} />,
    assistant: <AssistantPage {...ctx} />,
    settings: <SettingsPage {...ctx} />,
  };

  const renderSheet = () => {
    if (!sheet) return null;
    const close = () => setSheet(null);
    switch (sheet.type) {
      case 'tx':
        return <TransactionSheet tx={sheet.tx} defaultType={sheet.txType} actions={actions} onClose={close} />;
      case 'emi':
        return <EmiSheet emi={sheet.emi} prefill={sheet.prefill} actions={actions} onClose={close} />;
      case 'payEmi':
        return <PayEmiSheet emi={sheet.emi} analysis={analysis} actions={actions} onClose={close} />;
      case 'balance':
        return <BalanceSheet analysis={analysis} actions={actions} onClose={close} />;
      case 'upload':
        return <UploadSheet existing={data.transactions} actions={actions} onClose={close} />;
      case 'confirm':
        return <ConfirmSheet {...sheet} onClose={close} />;
      case 'score':
        return <CreditScoreSheet actions={actions} onClose={close} />;
      case 'goal':
        return <GoalSheet goal={sheet.goal} actions={actions} onClose={close} />;
      default:
        return null;
    }
  };

  const name = data.profile.fullName || 'Me';

  return (
    <>
      <header className="topbar">
        <button type="button" className="topbar-brand" onClick={() => actions.go('home')} aria-label="FinCopilot home">
          <span className="brand-mark" aria-hidden="true">F</span>
          <span className="brand-name">FinCopilot</span>
        </button>
        <div className="topbar-actions">
          <button type="button" className="topbar-icon" onClick={load} aria-label="Refresh" disabled={syncing}>
            <RefreshCw size={20} className={syncing ? 'spin' : ''} />
          </button>
          <button type="button" className="topbar-icon" onClick={() => actions.go('assistant')} aria-label="Ask FinCopilot AI">
            <Bot size={22} />
          </button>
          <button type="button" className="topbar-profile" onClick={() => actions.go('settings')} aria-label={`${name}: settings`}>
            <Avatar name={name} size={34} />
            <span className="topbar-who">
              <span className="topbar-name">{data.profile.fullName || 'Settings'}</span>
              <span className="topbar-sub">Settings</span>
            </span>
          </button>
        </div>
      </header>

      <div className="shell">
        <nav className="sidebar" aria-label="Main">
          <button type="button" className="btn btn-primary sidebar-pay" onClick={() => actions.newTx('debit')}>
            <Plus size={20} /> Add expense
          </button>
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`sidebar-item ${tab === id || (id === 'emis' && tab === 'calculator') ? 'active' : ''}`}
              onClick={() => actions.go(id)}
              aria-current={tab === id ? 'page' : undefined}
            >
              <Icon size={22} strokeWidth={1.8} />
              {label}
            </button>
          ))}
          <div className="sidebar-foot">Your data stays on this device.</div>
        </nav>
        <main className="main">{pages[tab]}</main>
      </div>

      <nav className="bottomnav" aria-label="Main">
        {BOTTOM.slice(0, 2).map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" className={`bottomnav-item ${tab === id || (id === 'emis' && tab === 'calculator') ? 'active' : ''}`} onClick={() => actions.go(id)} aria-current={tab === id ? 'page' : undefined}>
            <Icon size={24} strokeWidth={1.8} />
            {label}
          </button>
        ))}
        <button type="button" className="bottomnav-item" onClick={() => actions.newTx('debit')}>
          <span className="bottomnav-pay">
            <Plus size={26} />
          </span>
          Add
        </button>
        {BOTTOM.slice(2).map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" className={`bottomnav-item ${tab === id || (id === 'emis' && tab === 'calculator') ? 'active' : ''}`} onClick={() => actions.go(id)} aria-current={tab === id ? 'page' : undefined}>
            <Icon size={24} strokeWidth={1.8} />
            {label}
          </button>
        ))}
      </nav>

      {renderSheet()}
      {toast && (
        <div className={`toast ${toast.tone === 'error' ? 'error' : ''}`} role={toast.tone === 'error' ? 'alert' : 'status'}>
          {toast.text}
        </div>
      )}
    </>
  );
}
