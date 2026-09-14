# FinCopilot — AI Financial Decision & UPI Assistant

> Modern, high-performance Fintech web application built on the **MERN** stack with real-time AI affordability prediction, dual demo accounts, UPI PIN verification, and EMI protection.

[![Vercel Deployment](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://fincopilot-upi.vercel.app)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-fincopilot--upi.vercel.app-brightgreen?style=for-the-badge&logo=google-chrome)](https://fincopilot-upi.vercel.app)

### 🌐 Live Links
- **Primary Live App**: [https://fincopilot-upi.vercel.app](https://fincopilot-upi.vercel.app)
- **Production Alias**: [https://fincopilot-psi-two.vercel.app](https://fincopilot-psi-two.vercel.app)
- **API Health Check**: [https://fincopilot-upi.vercel.app/api/health](https://fincopilot-upi.vercel.app/api/health)

---

## 🌟 Overview (Step 1)

Step 1 establishes the core architectural foundation, data persistence, onboarding setup, and a fintech-grade financial dashboard with realistic demo data.

### ✨ Key Features in Step 1
- **Guided Onboarding / Account Setup**:
  - Full Name
  - Monthly Income
  - Salary Date (1–31)
  - Starting Account Balance
  - Multi-Currency Support (₹ INR, $ USD, € EUR, £ GBP)
- **Unified Financial Dashboard**:
  - **Current Account Balance** (Real-time computed ledger balance)
  - **Monthly Income** with salary cycle countdown badge
  - **Total Money Credited** (Inflow)
  - **Total Money Debited** (Outflow)
  - **Transactions Count**
  - **Spending Overview Chart** (Category breakdown & Cashflow timeline toggle)
  - **Simulated Platinum Card & Health Snapshot**
  - **Recent Transactions Ledger** with category badges, status, and colored credit/debit indicators
- **Transactions Explorer**: Full search and category/type filtering for simulated financial records.
- **Clean Architecture & Module Placeholders**: Prepared routing for *Payments* and *Analysis* modules.
- **Zero-Friction Database Setup**: Auto-connects to standard MongoDB (`mongodb://127.0.0.1:27017/fintech_copilot`) or falls back gracefully to an embedded in-memory MongoDB instance for instant hackathon demonstration.

---

## 🏗️ Project Structure

```
Phone_pay/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                 # MongoDB connection + in-memory fallback
│   │   ├── models/
│   │   │   ├── User.js               # User profile schema
│   │   │   ├── Account.js            # Financial account & balances schema
│   │   │   └── Transaction.js        # Transaction ledger schema
│   │   ├── controllers/
│   │   │   ├── accountController.js  # Setup, dashboard aggregation, reset handlers
│   │   │   └── transactionController.js # Transaction queries & filters
│   │   ├── routes/
│   │   │   ├── accountRoutes.js      # /api/account routes
│   │   │   └── transactionRoutes.js  # /api/transactions routes
│   │   ├── services/
│   │   │   └── seedService.js        # Realistic demo transaction generator
│   │   └── server.js                 # Express server & middleware
│   ├── .env
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx           # Clean navigation sidebar
│   │   │   ├── Header.jsx            # Top bar with greeting & quick actions
│   │   │   ├── StatCard.jsx          # Metric cards (Balance, Income, Credits, Debits)
│   │   │   ├── SpendingChart.jsx     # Spending breakdown & cashflow timeline
│   │   │   ├── RecentTransactions.jsx# Recent transactions table
│   │   │   └── OnboardingModal.jsx   # Guided account setup modal
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx         # Primary functional dashboard
│   │   │   ├── TransactionsPage.jsx  # Filterable transaction explorer
│   │   │   ├── PaymentsPlaceholder.jsx # Step 2 module preview
│   │   │   └── AnalysisPlaceholder.jsx # Step 3 module preview
│   │   ├── services/
│   │   │   └── api.js                # Axios client for backend API
│   │   ├── styles/
│   │   │   └── index.css             # Fintech glassmorphic design system
│   │   ├── App.jsx                   # Main layout and tab orchestrator
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── package.json                      # Root workspace orchestrator
└── README.md
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+ recommended)
- npm

### 1. Install Dependencies
```bash
# In backend/
cd backend && npm install

# In frontend/
cd ../frontend && npm install

# In root/
cd .. && npm install
```

### 2. Start Application
```bash
# From the root directory, start both backend and frontend concurrently:
npm run dev
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000](http://localhost:5000)
- **Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 📡 API Reference

### Account Endpoints (`/api/account`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/account/setup` | Create/update user & initialize simulated account + demo transactions |
| `GET` | `/api/account/current` | Check if an account profile exists |
| `GET` | `/api/account/dashboard` | Fetch aggregated dashboard metrics, charts, & recent transactions |
| `POST` | `/api/account/reset` | Clear all data to restart fresh onboarding |

### Transaction Endpoints (`/api/transactions`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/transactions` | Query transactions with optional `?category=`, `?type=`, and `?search=` filters |
| `POST` | `/api/transactions` | Create a new transaction |
