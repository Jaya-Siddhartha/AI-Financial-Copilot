import React from 'react';
import {
  ArrowDownLeft,
  AtSign,
  CalendarClock,
  ChevronRight,
  HandCoins,
  Landmark,
  PieChart,
  Plus,
  Smartphone,
} from 'lucide-react';
import { IconTile } from '../components/ui/IconTile';
import { Avatar } from '../components/ui/Avatar';
import { StatusChip } from '../components/ui/StatusChip';
import { Alert } from '../components/ui/Alert';
import { TransactionRow } from '../components/TransactionRow';
import { dueText, formatShortDate, inr } from '../lib/format';

export function upcomingEmis(emis = []) {
  return emis.filter((e) => e.status === 'upcoming').sort((a, b) => a.daysRemaining - b.daysRemaining);
}

export function HomePage({ data, contacts, actions }) {
  const { metrics, aiPrediction, salaryCycle, recentTransactions = [] } = data;
  const dueEmis = upcomingEmis(data.emis);
  const nextEmi = dueEmis[0];
  const tone = metrics.riskStatus === 'SAFE' ? 'brand' : metrics.riskStatus === 'CAUTION' ? 'amber' : 'red';

  return (
    <div className="page">
      <div className="grid-2">
        <div className="col">
          <section className="card summary" aria-label="Summary">
            <div className="summary-top">
              <div>
                <div className="summary-label">Safe to spend</div>
                <div className="summary-value">{inr(metrics.safeToSpend)}</div>
              </div>
              <StatusChip status={metrics.riskStatus} />
            </div>
            <div className="summary-note">
              {nextEmi
                ? `After keeping ${inr(metrics.totalUpcomingEMI)} for EMIs, ${inr(metrics.expectedNormalExpenses)} for daily spending and a ${inr(metrics.safetyReserve)} buffer.`
                : 'No EMIs due this cycle. Only a small safety buffer is kept aside.'}
            </div>
            <div className="summary-stats">
              <div className="summary-stat">
                <div className="summary-stat-label">Balance</div>
                <div className="summary-stat-value">{inr(metrics.currentBalance)}</div>
              </div>
              <div className="summary-stat">
                <div className="summary-stat-label">EMIs due</div>
                <div className="summary-stat-value">{inr(metrics.totalUpcomingEMI)}</div>
              </div>
              <div className="summary-stat">
                <div className="summary-stat-label">Salary</div>
                <div className="summary-stat-value">{dueText(salaryCycle.daysUntilSalary)}</div>
              </div>
            </div>
            <div className="divider" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <span className="muted small">
                Bank balance {inr(metrics.verifiedBalance)} · checked {formatShortDate(metrics.lastBalanceCheckDate)}
              </span>
              <button type="button" className="link-btn" onClick={actions.checkBalance}>
                Check
              </button>
            </div>
          </section>

          <section className="card" aria-labelledby="transfers-title">
            <div className="card-head">
              <h2 className="card-title" id="transfers-title">Transfer money</h2>
            </div>
            <div className="tiles">
              <IconTile icon={Smartphone} label="To mobile number" onClick={() => actions.pay(null, 'mobile')} />
              <IconTile icon={AtSign} label="To UPI ID" onClick={() => actions.pay(null, 'upi')} />
              <IconTile icon={ArrowDownLeft} label="Receive money" onClick={actions.receive} />
              <IconTile icon={Landmark} label="Check balance" onClick={actions.checkBalance} />
            </div>
          </section>

          <section className="card" aria-labelledby="loans-title">
            <div className="card-head">
              <h2 className="card-title" id="loans-title">Loans & planning</h2>
            </div>
            <div className="tiles">
              <IconTile
                icon={HandCoins}
                label="Pay EMI"
                onClick={() => (nextEmi ? actions.payEmi(nextEmi) : actions.go('emis'))}
              />
              <IconTile icon={Plus} label="Add EMI" onClick={actions.addEmi} />
              <IconTile icon={CalendarClock} label="My EMIs" onClick={() => actions.go('emis')} />
              <IconTile icon={PieChart} label="Insights" onClick={() => actions.go('insights')} />
            </div>
          </section>

          <section className="card" aria-labelledby="people-title">
            <div className="card-head">
              <h2 className="card-title" id="people-title">People</h2>
              <button type="button" className="link-btn" onClick={() => actions.pay()}>
                New payment <ChevronRight size={16} />
              </button>
            </div>
            <div className="people">
              {contacts.map((c) => (
                <button key={c.phone} type="button" className="person" onClick={() => actions.pay(c)}>
                  <Avatar name={c.name} size={48} />
                  <span className="person-name">{c.name.replace(/\s*\(.*\)/, '').split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="col">
          <section className="card" aria-labelledby="insight-title">
            <div className="card-head">
              <h2 className="card-title" id="insight-title">This cycle</h2>
              <button type="button" className="link-btn" onClick={() => actions.go('insights')}>
                Details <ChevronRight size={16} />
              </button>
            </div>
            <p style={{ marginBottom: 12 }}>{aiPrediction.summary}</p>
            <Alert tone={tone}>{aiPrediction.advice}</Alert>
          </section>

          <section className="card" aria-labelledby="emi-title">
            <div className="card-head">
              <h2 className="card-title" id="emi-title">Upcoming EMIs</h2>
              <button type="button" className="link-btn" onClick={() => actions.go('emis')}>
                All <ChevronRight size={16} />
              </button>
            </div>
            {dueEmis.length === 0 ? (
              <div className="empty">No EMIs due this cycle.</div>
            ) : (
              <div className="list">
                {dueEmis.slice(0, 3).map((emi) => (
                  <div key={emi._id || emi.id} className="row">
                    <span className="icon-circle" style={{ width: 40, height: 40 }}>
                      <HandCoins size={20} strokeWidth={1.8} />
                    </span>
                    <div className="row-main">
                      <div className="row-title">{emi.name}</div>
                      <div className="row-sub">
                        {inr(emi.amount)} · due {dueText(emi.daysRemaining)}
                      </div>
                    </div>
                    <button type="button" className="btn btn-soft btn-sm" onClick={() => actions.payEmi(emi)}>
                      Pay
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card" aria-labelledby="recent-title">
            <div className="card-head">
              <h2 className="card-title" id="recent-title">Recent transactions</h2>
              <button type="button" className="link-btn" onClick={() => actions.go('history')}>
                See all <ChevronRight size={16} />
              </button>
            </div>
            {recentTransactions.length === 0 ? (
              <div className="empty">No transactions yet.</div>
            ) : (
              <div className="list">
                {recentTransactions.slice(0, 5).map((tx) => (
                  <TransactionRow key={tx._id || tx.id} tx={tx} onClick={() => actions.openTx(tx)} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
