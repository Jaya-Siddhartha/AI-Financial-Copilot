# FinCopilot

**UPI payments that tell you how much is safe to spend before your EMIs are due.**

FinCopilot is a demo payments app for Indian UPI users. It works like a regular UPI app: pay to a mobile number or UPI ID, check your balance with a UPI PIN, receive money, and see your history. It adds one thing most payment apps don't: **before you pay, it checks whether the payment would leave you short for an upcoming loan EMI**, and warns you on the pay screen.

> **Everything is simulated.** Accounts, banks and payments are fake and no real money moves. Demo UPI PIN: `1234`.

- **Live app:** https://fincopilot-upi.vercel.app
- **API health check:** https://fincopilot-upi.vercel.app/api/health

| Home (phone) | Pay screen with EMI warning | UPI PIN |
|---|---|---|
| ![Home](docs/screenshots/mobile-home.png) | ![Pay](docs/screenshots/mobile-pay-warning.png) | ![PIN](docs/screenshots/mobile-upi-pin.png) |

![Desktop home](docs/screenshots/desktop-home.png)

---

## Contents

1. [How it works](#how-it-works)
2. [Features](#features)
3. [What changed in this update](#what-changed-in-this-update)
4. [Tech stack](#tech-stack)
5. [Project structure](#project-structure)
6. [Run it locally](#run-it-locally)
7. [Browser-only demo](#browser-only-demo)
8. [Tests](#tests)
9. [Configuration](#configuration)
10. [Deployment](#deployment)
11. [API reference](#api-reference)
12. [Contributing](#contributing)
13. [Documentation](#documentation)

---

## How it works

FinCopilot works out one number: **safe to spend**.

```
safe to spend = current balance
              − EMIs due this cycle
              − expected daily spending × days until the next EMI
              − ₹2,000 safety buffer
```

- **Expected daily spending** is your discretionary spending (everything except rent and EMIs) divided by 30, with a minimum of ₹300 a day.
- **Status** is one of three levels:
  - **Safe:** the balance covers EMIs, expected spending and the buffer.
  - **Caution:** EMIs and spending are covered, but the buffer isn't.
  - **At risk:** the balance won't cover EMIs plus expected spending. The app shows how much you'd be short.

The formula is fixed and explainable, not a trained model. The **Insights** screen shows the calculation line by line, and the **Can I afford it?** tool shows what any amount would do to your status before you pay. The engine lives in [`backend/src/services/financialEngine.js`](backend/src/services/financialEngine.js).

## Features

| Area | What you can do |
|---|---|
| **Two demo accounts** | Siddhartha (₹50,000, ₹20,000 personal loan EMI) and Rahul (₹30,000, ₹4,000 two-wheeler EMI). Paying one from the other debits and credits both. |
| **Pay** | Pay to a 10-digit mobile number, a UPI ID or a saved contact. Add a note. Enter your PIN on a UPI-style keypad. Payments are capped at ₹1,00,000 (the NPCI limit for person-to-person UPI). |
| **EMI warning** | While you type an amount, the pay screen says whether it's safe, whether your buffer gets thin, or exactly how much you'd be short for which EMI. |
| **UPI PIN protection** | Every payment, balance check and PIN change needs the PIN. 3 wrong attempts lock it for 5 minutes. |
| **Check balance** | Enter your PIN to see your balance. This also sets the "last checked" baseline. |
| **Receive money** | Copy your UPI ID, or simulate an incoming payment. |
| **EMIs** | Add, pay and remove EMIs. Due-date countdown with colour-coded urgency. A paid EMI becomes due again next cycle; a loan with no months left shows as closed. |
| **Insights** | Your status, the safe-to-spend calculation, **Can I afford it?**, the next 7 days of projected balance, spending by category, and a 30/60/90-day outlook. |
| **History** | Search, filter by paid/received and category, open a transaction to change its category, and download a CSV statement. |
| **Profile** | Switch demo account, change UPI PIN, reset all demo data. |
| **Layout** | Bottom tab bar on phones, sidebar on desktop. Works down to 360 px wide. |

## What changed in this update

This update was a full audit and rebuild, keeping the product idea, demo accounts, formula and API routes the same. The complete list with evidence is in [AUDIT_REPORT.md](AUDIT_REPORT.md).

### Bugs and security issues fixed

| Before | After |
|---|---|
| A payment sent **without any UPI PIN** went through | The PIN is required for every payment |
| Unlimited wrong PIN guesses | 3 wrong attempts lock the PIN for 5 minutes |
| With MongoDB configured, payments, balance checks and PIN changes still wrote to a local file, so balances diverged | All operations go through one data layer that works with MongoDB or the JSON file |
| On Vercel, the database connection was never opened | Opened on the first API request |
| Anyone could delete another user's EMI | EMIs can only be removed by their owner |
| A paid EMI stayed "paid" forever, and could be paid twice | It becomes due again next cycle; paying twice is refused |
| EMI payments were saved under a category that doesn't exist | Saved as "EMI & Loans" |
| The Insights 30/60/90-day forecast showed **made-up numbers** | Uses the real forecast |
| "Can I afford it?" said a ₹20,000 purchase was Safe, then the app showed At risk after you paid it | The simulator uses the engine's own rules and matches the dashboard exactly |
| Every user's forecast subtracted ₹10,000 rent, even with no rent | Uses rent actually paid |
| Missing EMI name crashed the server | Clear validation errors |
| Any text accepted as a category; raw text used as a database regex; ₹0.001 payments allowed | Categories whitelisted, search escaped, amounts rounded to paise |
| Balance updates could be lost under concurrent requests | Atomic balance updates |
| A committed backup file contained users' UPI PINs | Removed, and the backup folder is git-ignored |

### New interface

- Rebuilt in the style of mainstream UPI apps: purple top bar, icon tiles for common actions, a People row, bottom sheets, a UPI PIN keypad, and a success screen with the real transaction ID.
- One icon set (Lucide) at one stroke weight. No emojis, gradients or "AI" decoration. Plain language ("At risk" instead of "HIGH RISK Shortfall Warning").
- New screens using existing APIs: change UPI PIN, remove EMI, transaction details, CSV statement.
- Accessibility: labelled inputs, dialog and tab roles, visible focus rings, reduced-motion support.

### Removed

13 old components and 8 old pages (including 4 that never appeared on screen), 3 unused libraries (`chart.js`, `react-chartjs-2`, `clsx`), a broken committed build, runtime data files, old test scripts that never reported failure, and two outdated reports. Frontend source went from about 6,650 to about 3,900 lines.

### Added

- **API test suite:** 13 tests with `npm test`, self-contained, fails properly in CI.
- **Browser-only demo:** a single HTML page that runs the whole app without a server ([below](#browser-only-demo)).
- **[AUDIT_REPORT.md](AUDIT_REPORT.md)** and **[UPGRADES.md](UPGRADES.md)** (roadmap compared with PhonePe, Google Pay, Paytm, CRED and others).

## Tech stack

| Part | Technology |
|---|---|
| Frontend | React 18, Vite 5, Axios, Lucide icons, plain CSS (design tokens in `styles/index.css`) |
| Backend | Node.js, Express 4, Mongoose 8 |
| Storage | MongoDB (when `MONGODB_URI` is set) or a JSON file (`backend/data/db.json`) |
| Tests | `node:test` (API), Playwright (browser walkthroughs used during the audit) |
| Hosting | Vercel (`vercel.json`: `/api/*` → backend, everything else → frontend) |

## Project structure

```
AI-Financial-Copilot/
├── backend/
│   ├── src/
│   │   ├── server.js                Express app, routes, DB connection middleware
│   │   ├── config/                  db.js (MongoDB), store.js (JSON file store), categories.js
│   │   ├── controllers/             account, transaction and EMI request handlers
│   │   ├── services/
│   │   │   ├── dataService.js       storage layer + UPI PIN checks + transfers
│   │   │   ├── financialEngine.js   safe-to-spend, risk status, forecasts
│   │   │   ├── seedData.js          demo accounts (shared with the browser demo)
│   │   │   └── seedService.js       loads the demo data
│   │   ├── models/                  Mongoose schemas
│   │   ├── routes/                  /api/account, /api/transactions, /api/emi
│   │   └── scripts/exportBackup.js  JSON backup export
│   └── tests/api.test.js            API tests
├── frontend/
│   ├── src/
│   │   ├── App.jsx                  app shell: top bar, sidebar / bottom nav, sheets
│   │   ├── pages/                   Home, Insights, EMIs, History, Profile
│   │   ├── flows/                   Pay, check balance, change PIN, receive, EMI, transaction sheets
│   │   ├── components/              TransactionRow + ui/ (Sheet, PinPad, Avatar, Alert, ...)
│   │   ├── lib/                     formatting, "Can I afford it?" simulator
│   │   ├── services/                api.js (HTTP client), browserApi.js (in-page API for the demo)
│   │   └── styles/index.css         design system
│   └── scripts/                     build-demo.mjs, serve-browser-api.mjs
├── api/index.js                     serverless entry wrapping the Express app
├── docs/                            screenshots, backup and recovery guide
├── AUDIT_REPORT.md
├── UPGRADES.md
├── CONTRIBUTING.md
└── vercel.json
```

## Run it locally

You need **Node.js 18 or newer** (tested on 22).

```bash
git clone https://github.com/Jaya-Siddhartha/AI-Financial-Copilot.git
cd AI-Financial-Copilot

npm install                          # root (runs backend + frontend together)
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

npm run dev
```

- App: http://localhost:5173
- API: http://localhost:5000/api/health

The backend creates the two demo accounts on first start. Use PIN `1234`. To start over, use **Profile → Reset demo data**.

## Browser-only demo

The whole app can also run as one HTML page with no server, which is handy for sharing a clickable demo.

```bash
cd frontend
npm run build:demo        # → frontend/dist-demo/fincopilot-demo.html
```

API calls are answered inside the page by `src/services/browserApi.js`. It reuses the backend's engine, categories and seed data, so every number matches the real server. Data is saved in the browser's localStorage, and the demo shows placeholder bank names.

To confirm the in-page API behaves exactly like the server, run the backend tests against it:

```bash
cd frontend && node scripts/serve-browser-api.mjs 5055 &
cd ../backend && API_URL=http://127.0.0.1:5055/api npm test
```

## Tests

```bash
cd backend && npm test        # 13 API tests against a temporary data folder
cd frontend && npm run build  # production build must succeed
```

The API tests cover: the full demo scenario (both accounts, transfers, balance check, EMIs, risk levels, reset), PIN required, PIN lockout and reset, PIN change, amount limits, EMI ownership and validation, category whitelist, recipient matching, the rent-based forecast, and that "Can I afford it?" predicts the dashboard after a real payment.

## Configuration

Copy `.env.example` to `backend/.env` for backend settings. `VITE_API_BASE_URL` goes in `frontend/.env`.

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `5000` | Backend port |
| `MONGODB_URI` | empty | MongoDB connection string. Without it, data is stored in `backend/data/db.json` |
| `VITE_API_BASE_URL` | `/api` | API base URL for the frontend, if hosted separately |
| `FINCOPILOT_DATA_DIR` | `backend/data` | Where the JSON store keeps `db.json` (used by the tests) |

## Deployment

The repo deploys to Vercel as-is with `vercel.json`.

- If the Vercel project is connected to GitHub, pushing a branch creates a preview deployment and merging to `main` updates production.
- Manual deploy: `npm i -g vercel && vercel --prod` from the repo root.
- **Set `MONGODB_URI` in Vercel.** Without it, data is kept per server instance in `/tmp`, so balances can differ between requests and reset on cold start.

After deploying, check that `/api/health` returns `online` and that a ₹1 payment with PIN `1234` succeeds.

## API reference

All routes are under `/api`. Responses are JSON with `success` and either `data` or `message`.

| Method | Path | Body / query | Purpose |
|---|---|---|---|
| GET | `/health` | | Health check |
| GET | `/account/all` | | Demo accounts for the switcher |
| GET | `/account/dashboard` | `?userId=` | Balances, safe-to-spend, status, EMIs, insights, recent transactions |
| POST | `/account/check-balance` | `{ userId, upiPin }` | Check balance with PIN |
| POST | `/account/update-pin` | `{ userId, oldPin, newPin }` | Change UPI PIN |
| POST | `/account/reset` | | Restore demo data |
| GET | `/transactions` | `?userId=&type=&category=&search=&limit=` | History |
| POST | `/transactions/payment` | `{ senderId, recipientPhone \| recipientUpi \| recipientName, amount, upiPin, note }` | Pay |
| POST | `/transactions/receive` | `{ userId, senderName, amount, category, note }` | Simulate an incoming payment |
| PATCH | `/transactions/:id/category` | `{ category }` | Change a transaction's category |
| GET | `/emi` | `?userId=` | List EMIs |
| POST | `/emi` | `{ userId, name, lender, amount, dueDay, remainingInstallments }` | Add an EMI |
| POST | `/emi/:id/pay` | `{ userId }` | Pay an EMI |
| DELETE | `/emi/:id` | `?userId=` | Remove an EMI |

Error codes: `400` invalid input or wrong PIN, `404` not found, `423` PIN locked, `500` server error.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, branch naming, code style and the checks to run before opening a pull request. Good first issues are listed in [UPGRADES.md](UPGRADES.md).

## Documentation

| File | What's in it |
|---|---|
| [AUDIT_REPORT.md](AUDIT_REPORT.md) | Full audit: every issue found, evidence, fix status, verification |
| [UPGRADES.md](UPGRADES.md) | Recommended upgrades and comparison with other UPI and money apps |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute |
| [docs/DATABASE_BACKUP_AND_RECOVERY.md](docs/DATABASE_BACKUP_AND_RECOVERY.md) | Backups (`cd backend && npm run backup`) and recovery |
