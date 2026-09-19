import React from 'react';
import {
  ShieldCheck,
  Zap,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  PieChart,
  Lock,
  Sparkles,
  ChevronRight,
  Landmark,
  Layers,
  BarChart3
} from 'lucide-react';

export function StartPage({ onStart, onNavigateToTab }) {
  return (
    <div className="start-page-container">
      {/* Hero Section */}
      <section className="start-hero">
        <div className="start-badge">
          <Sparkles size={14} className="text-primary" />
          <span>Next-Gen Financial Intelligence & UPI Copilot</span>
        </div>

        <h1 className="start-title">
          FinCopilot
        </h1>

        <p className="start-subtitle">
          Know what you can safely spend before your EMI is due.
        </p>

        <p className="start-description">
          An AI-powered personal cash flow and debt commitment guardian built for Indian UPI users.
          Proactively prevents account depletion, forecasts multi-month commitments, and provides real-time Safe-to-Spend limits.
        </p>

        <div className="start-cta-group">
          <button
            id="start-now-btn"
            className="btn btn-primary btn-lg start-primary-btn"
            onClick={onStart}
          >
            <span>START NOW</span>
            <ArrowRight size={18} />
          </button>
          <a
            href="#how-it-works"
            className="btn btn-secondary btn-lg"
          >
            <span>HOW IT WORKS</span>
          </a>
        </div>

        {/* Quick Highlights Bar */}
        <div className="start-highlights-bar">
          <div className="highlight-item">
            <div className="highlight-icon bg-success-light">
              <CheckCircle2 size={16} className="text-success" />
            </div>
            <span>4-Digit UPI PIN Simulation</span>
          </div>
          <div className="highlight-item">
            <div className="highlight-icon bg-primary-light">
              <TrendingUp size={16} className="text-primary" />
            </div>
            <span>Daily Burn & 7-Day Outlook</span>
          </div>
          <div className="highlight-item">
            <div className="highlight-icon bg-warning-light">
              <ShieldCheck size={16} className="text-warning" />
            </div>
            <span>Deterministic Risk Engine</span>
          </div>
          <div className="highlight-item">
            <div className="highlight-icon bg-indigo-light">
              <PieChart size={16} className="text-primary" />
            </div>
            <span>Interactive What-If Simulator</span>
          </div>
        </div>
      </section>

      {/* Visual Architectural Flow / How It Works */}
      <section id="how-it-works" className="start-flow-section">
        <div className="section-header-center">
          <div className="section-pill">SYSTEM ARCHITECTURE</div>
          <h2 className="section-heading">How FinCopilot Protects Your Money</h2>
          <p className="section-subtext">
            Continuous real-time flow from bank balance baseline to predictive spending safety.
          </p>
        </div>

        <div className="flow-grid">
          {/* Step 1 */}
          <div className="flow-card">
            <div className="flow-step-num">01</div>
            <div className="flow-card-icon">
              <Landmark size={24} />
            </div>
            <h3>Bank Baseline & UPI Ledger</h3>
            <p>
              Dual-account simulation (Siddhartha ₹50,000 & Rahul ₹30,000) with PIN-authorized inter-account transfers and balance drift reconciliation.
            </p>
            <div className="flow-card-footer">
              <span className="flow-tag">HDFC & ICICI</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flow-card">
            <div className="flow-step-num">02</div>
            <div className="flow-card-icon">
              <Layers size={24} />
            </div>
            <h3>Transaction Categorization</h3>
            <p>
              Unified canonical category taxonomies with instant manual re-classification and historical spend tracking.
            </p>
            <div className="flow-card-footer">
              <span className="flow-tag">8 Canonical Categories</span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flow-card highlight-card">
            <div className="flow-step-num">03</div>
            <div className="flow-card-icon">
              <ShieldCheck size={24} />
            </div>
            <h3>Safe-to-Spend Formula</h3>
            <p>
              Calculates <code className="flow-formula">Balance - (EMIs + Fixed + Buffer)</code> to give you a single safe daily spending budget.
            </p>
            <div className="flow-card-footer">
              <span className="flow-tag active">Core Metric</span>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flow-card">
            <div className="flow-step-num">04</div>
            <div className="flow-card-icon">
              <BarChart3 size={24} />
            </div>
            <h3>7-Day & Multi-Month Forecast</h3>
            <p>
              Day-by-day projected balance trajectory showing exactly when upcoming EMIs hit and whether your account dips below safe thresholds.
            </p>
            <div className="flow-card-footer">
              <span className="flow-tag">30 / 60 / 90 Days</span>
            </div>
          </div>

          {/* Step 5 */}
          <div className="flow-card">
            <div className="flow-step-num">05</div>
            <div className="flow-card-icon">
              <AlertTriangle size={24} />
            </div>
            <h3>Deterministic Risk Assessment</h3>
            <p>
              Evaluates risk tiers (<code>SAFE</code>, <code>CAUTION</code>, <code>HIGH RISK</code>) with explicit, explainable mathematical breakdown reasons.
            </p>
            <div className="flow-card-footer">
              <span className="flow-tag">No Black Box</span>
            </div>
          </div>

          {/* Step 6 */}
          <div className="flow-card">
            <div className="flow-step-num">06</div>
            <div className="flow-card-icon">
              <Zap size={24} />
            </div>
            <h3>Interactive What-If Engine</h3>
            <p>
              Simulate prospective purchases and EMIs before swiping. Visualizes BEFORE vs. AFTER impact on safe spend and risk level instantly.
            </p>
            <div className="flow-card-footer">
              <span className="flow-tag">Instant Sandbox</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section className="start-features-section">
        <div className="section-header-center">
          <div className="section-pill">CORE CAPABILITIES</div>
          <h2 className="section-heading">Designed for Complete Peace of Mind</h2>
        </div>

        <div className="features-columns">
          <div className="feature-box">
            <div className="feature-icon bg-primary-light text-primary">
              <Lock size={22} />
            </div>
            <div className="feature-content">
              <h4>Bank-Grade PIN Security</h4>
              <p>Simulates UPI PIN entry with masked digits, verification against demo credentials, and real-time ledger debit/credit synchronization.</p>
            </div>
          </div>

          <div className="feature-box">
            <div className="feature-icon bg-success-light text-success">
              <CheckCircle2 size={22} />
            </div>
            <div className="feature-content">
              <h4>Active EMI Lifecycle</h4>
              <p>Add new loans, track remaining tenures, see due date proximity alerts, and mark EMIs as paid with automatic balance deductions.</p>
            </div>
          </div>

          <div className="feature-box">
            <div className="feature-icon bg-warning-light text-warning">
              <TrendingUp size={22} />
            </div>
            <div className="feature-content">
              <h4>Daily Burn Rate Analytics</h4>
              <p>Analyzes your past 30-day velocity to accurately predict end-of-month liquidity and buffer depletion rates.</p>
            </div>
          </div>

          <div className="feature-box">
            <div className="feature-icon bg-indigo-light text-primary">
              <Sparkles size={22} />
            </div>
            <div className="feature-content">
              <h4>Actionable AI Copilot Guidance</h4>
              <p>Receive contextual recommendations tailored to your exact cash position, upcoming obligations, and spending patterns.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="start-bottom-cta">
        <div className="bottom-cta-content">
          <h2>Ready to experience FinCopilot?</h2>
          <p>Launch the interactive workspace with pre-loaded demo accounts and live simulations.</p>
          <button
            className="btn btn-primary btn-lg"
            onClick={onStart}
          >
            <span>ENTER WORKSPACE</span>
            <ChevronRight size={18} />
          </button>
        </div>
      </section>
    </div>
  );
}
