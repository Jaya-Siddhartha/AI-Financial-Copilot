# FinCopilot

**Know what you can spend before you spend it.**

FinCopilot is an expense and EMI manager for people in India. Upload your PhonePe, Google Pay, Paytm or bank statements (or add expenses by hand), add your loans, and it tells you one simple thing: **how much you can spend without missing an EMI**. It warns you when you are overspending, reminds you before EMIs are due, and has an AI assistant that runs on your own device.

It is built to be easy for everyone, from a 20-year-old student to a 60-year-old first-time smartphone user: one big number, plain words, big buttons, a text-size setting, six colour themes and a "Read aloud" button.

> FinCopilot does not move money and is not a bank. It reads what you give it and helps you decide.

- **Live app:** https://fincopilot-jaya-siddharthas-projects.vercel.app
- **Test report (simple English):** [TEST_REPORT.md](TEST_REPORT.md) · **What changed:** [CHANGES.md](CHANGES.md) · **Audit:** [AUDIT_REPORT.md](AUDIT_REPORT.md)

| Home | Upload up to 5 statements | Your safety buffer |
|---|---|---|
| ![Home](docs/screenshots/mobile-home.png) | ![Upload](docs/screenshots/mobile-upload.png) | ![Buffer](docs/screenshots/mobile-settings-buffer.png) |

| EMI calculator | Credit health estimate | Ask the assistant |
|---|---|---|
| ![EMI calculator](docs/screenshots/mobile-emi-calculator.png) | ![Credit health](docs/screenshots/mobile-credit-health.png) | ![Assistant](docs/screenshots/mobile-assistant.png) |

| Doomsday | Dark | Saffron | Ocean | Light |
|---|---|---|---|---|
| ![Doomsday](docs/screenshots/theme-doomsday.png) | ![Dark](docs/screenshots/theme-dark.png) | ![Saffron](docs/screenshots/theme-saffron.png) | ![Ocean](docs/screenshots/theme-ocean.png) | ![Light](docs/screenshots/theme-light.png) |

![Desktop insights](docs/screenshots/desktop-insights.png)

---

## Contents

1. [What it does](#what-it-does)
2. [How "safe to spend" works](#how-safe-to-spend-works)
3. [The offline AI](#the-offline-ai)
4. [Credit health estimate](#credit-health-estimate)
5. [Tech and architecture](#tech-and-architecture)
6. [Run it locally](#run-it-locally)
7. [Supabase setup](#supabase-setup)
8. [Tests](#tests)
9. [Deployment](#deployment)
10. [Project structure](#project-structure)
11. [Research behind the design](#research-behind-the-design)

---

## What it does

| Feature | What you get |
|---|---|
| **Sign in** | Email and password account (Supabase Auth), email confirmation, forgot password, change password, delete account. |
| **Simple setup** | Name, income and salary day → your bank balance → your safety buffer → your theme. Four short steps. |
| **Home** | One big "You can spend safely" figure, your balance and how it was worked out, four big buttons, your next EMI, tips and recent transactions. |
| **Upload statements** | Up to **5 files at once**: PhonePe, Google Pay, Paytm, BHIM or any bank, as **PDF (including password-locked), Excel (.xlsx) or CSV**. Files are read on your device. A preview lets you **tick or untick every transaction** and change its category. Duplicates (the same payment in two statements, or already saved) are found and unticked for you. |
| **Add by hand** | Money out or money in, with the category picked automatically from the description. |
| **Balance** | Worked out from your transactions: the last figure you confirmed with your bank, plus money in, minus money out. **Match with bank** resets it and tells you if something happened outside the app (cash, bank charges, other apps). |
| **Safety buffer (your choice)** | In Settings: switch it on or off, and pick ₹1,000 / ₹2,000 / ₹3,000 / ₹5,000 / 5% of income, or type any amount. |
| **EMIs** | Add loans, see what is due and what is late, mark as paid, **autopay** (records the EMI as paid automatically on its due date), months left and % repaid, and how much of your income goes to EMIs. |
| **EMI calculator** | Monthly EMI, total interest, a year-by-year schedule, whether it fits your income, and "Add as EMI". |
| **Stop overspending** | Spending-pace alert ("faster than usual this month"), category spikes, repeating payments (subscriptions), a 7-day balance forecast, a calendar of money in and out, and a "Can I afford it?" check. |
| **Credit health estimate** | A 300–900 estimate from your data with the six factors behind it, and a tip for each. Clearly labelled as an estimate, not your CIBIL score. |
| **Assistant** | Ask in plain words. Money decisions get exact answers from the calculator; open questions can use the **offline AI** that runs on your device. |
| **Six themes and text size** | Purple (default), Light, Dark, Doomsday, Saffron, Ocean; Normal, Large or Extra large text. Saved to your account. |
| **Private** | Every table is locked so only you can read your rows; statement files are kept in a private folder only you can open. |

## How "safe to spend" works

```
safe to spend = your balance
              − EMIs due in the next month
              − your usual daily spending × days until the next EMI
              − your safety buffer (if you turned it on)
```

- **Your balance** = the amount you last confirmed with your bank + money in − money out since then.
- **Usual daily spending** = your everyday spending over the last 30 days (or fewer, if you have less history), divided by those days. Rent, EMIs, savings and **one-off payments over max(₹5,000, 20% of income)** are left out, so one big purchase does not make every day look expensive.
- **When no EMI is waiting**, nothing is kept aside for everyday spending: safe to spend = balance − buffer.
- **Status:** *Safe* (all covered), *Be careful* (covered but the buffer is not, or an EMI is late), *At risk* (you could be short for an EMI; it shows by how much).
- **"Can I afford it?"** runs the exact same calculation with the purchase added, so it always matches what you will see after spending.

The engine is [`frontend/src/lib/engine.js`](frontend/src/lib/engine.js). It runs on your device, so the screen updates instantly (about 20 ms) and works with thousands of transactions.

## The offline AI

The assistant can use a real language model, **Qwen 2.5 (Apache-2.0)**, running **inside your browser** with WebLLM and your graphics card (WebGPU). There is no API key, no account, and your questions never leave your device.

- **Smart** (about 1 GB) or **Lite** (about 400 MB). It downloads once, then works offline.
- It only knows what is in your own data, handed to it as a fact sheet with every question.
- **Money decisions** ("Can I afford…", loans, EMIs, safe to spend, credit score) are always answered by the exact calculator, not the model. The model handles open questions such as saving tips.
- **Any AI answer with a rupee amount that is not in your data is thrown away** and the exact figures are shown instead.
- Needs a browser with WebGPU (recent Chrome or Edge on a computer, some newer phones). Everywhere else the built-in assistant answers instantly.

Details and test results: [TEST_REPORT.md §5](TEST_REPORT.md#5-the-offline-ai).

## Credit health estimate

Real credit scores (CIBIL, Experian, Equifax, CRIF) come from credit bureaus, which only give access to registered businesses through paid, KYC-checked partners. There is no free, legal way for an app like this to fetch your real score. So FinCopilot shows an **estimate** on the same 300–900 scale, from what it can see:

| Factor | Weight |
|---|---|
| Paying EMIs on time (no late EMIs, no penalties) | 35% |
| Share of income going to EMIs (under 40% is healthy) | 25% |
| Saving each month | 15% |
| No bounced payments or penalty charges in statements | 10% |
| Length of history seen | 10% |
| Number of loans at once | 5% |

It is always labelled as an estimate. A real bureau score can be added later through a licensed partner (see [UPGRADES.md](UPGRADES.md)).

## Tech and architecture

```text
Your phone or computer (React app)                         Supabase (your project)
┌──────────────────────────────────────────┐   HTTPS   ┌─────────────────────────────┐
│ Screens: Home, History, Insights, EMIs,  │ ───────►  │ Auth: email + password      │
│ Assistant, Settings                      │           │ Postgres: profiles,         │
│ Money engine, statement reader, EMI      │ ◄───────  │ transactions, emis,         │
│ maths, credit estimate (all on device)   │           │ statements (row-level       │
│ Offline AI: WebLLM + Qwen 2.5 (WebGPU)   │           │ security on every table)    │
└──────────────────────────────────────────┘           │ Storage: private statements │
                                                       └─────────────────────────────┘
```

| Part | Technology |
|---|---|
| App | React 18, Vite 8, Lucide icons, plain CSS with six themes |
| Login, data, files | Supabase (Auth, Postgres with row-level security, Storage) |
| Statement reading | pdf.js (PDF, including locked files), Papa Parse (CSV), read-excel-file (.xlsx) |
| Offline AI | WebLLM running Qwen 2.5 Instruct (0.5B or 1.5B) on WebGPU |
| Tests | `node:test`: unit tests + a seeded simulation; GitHub Actions |
| Hosting | Vercel (static app); Supabase for data |

Saving is "optimistic": the screen changes immediately, the data is saved in the background, and if saving fails the change is undone with a clear message.

## Run it locally

You need **Node.js 20.19+ or 22.12+**.

```bash
git clone https://github.com/Jaya-Siddhartha/AI-Financial-Copilot.git
cd AI-Financial-Copilot/frontend
npm install
npm run dev          # the real app, using the Supabase project in src/config.js
```

Open http://localhost:5173.

To try every screen **without an account**, use test mode. Data is kept in memory in your browser tab and is never sent anywhere:

```bash
npm run dev:mock
```

Sample statements for trying the upload are in [`frontend/tests/fixtures`](frontend/tests/fixtures). The PhonePe sample's password is `9876543210`.

## Supabase setup

The database is already set up in the FinCopilot Supabase project. To use another project, run [`supabase/migrations/0001_initial_schema.sql`](supabase/migrations/0001_initial_schema.sql) in its SQL Editor and set `VITE_SUPABASE_URL` / `VITE_SUPABASE_KEY` (see `.env.example`).

**One setting you need to make in the Supabase dashboard** (Authentication → URL Configuration):

- **Site URL:** `https://fincopilot-jaya-siddharthas-projects.vercel.app`
- **Redirect URLs:** add `https://fincopilot-jaya-siddharthas-projects.vercel.app/**`, `https://*-jaya-siddharthas-projects.vercel.app/**` and `http://localhost:5173/**`

Without this, confirmation and password-reset emails send people to `localhost:3000`. Supabase's built-in email sender allows only a few emails per hour. For a hackathon demo you can turn off **Confirm email** (Authentication → Providers → Email), or add your own SMTP for real use.

## Tests

```bash
cd frontend
npm test                                  # 28 tests, including a 3,000-situation simulation (~15 s)
SIM_RUNS=20000 SIM_SEED=777 npm test      # the full simulation from the test report (~90 s)
```

Latest full run: **391,372 checks, 0 failures.** See [TEST_REPORT.md](TEST_REPORT.md). GitHub Actions runs the tests, the build and a security audit on every push.

## Deployment

The repo deploys to Vercel from `main` (`vercel.json` serves the `frontend` folder). The app needs no server of its own and no secret keys: the Supabase URL and publishable key are public by design, and row-level security protects the data.

## Project structure

```
AI-Financial-Copilot/
├── frontend/
│   ├── src/
│   │   ├── App.jsx                 sign-in gate, setup, navigation, instant saving, autopay
│   │   ├── config.js               Supabase URL and publishable key
│   │   ├── pages/                  Auth, Onboarding, Home, Activity (history), Insights, EMIs, Assistant, Settings
│   │   ├── flows/                  sheets: transaction, EMI, mark paid, match with bank, upload, confirm
│   │   ├── components/             charts (projection, donut, calendar, trend, credit gauge), theme picker, UI parts
│   │   ├── lib/                    engine, statement reader, categories, EMI maths, credit estimate, advisor, offline AI
│   │   ├── data/                   store.js (Supabase) and mockStore.js (test mode only)
│   │   └── styles/index.css        design system with six themes
│   └── tests/                      unit tests, simulation, sample statements
├── supabase/migrations/            database tables, security rules, storage bucket
├── docs/                           screenshots, latest simulation report
├── TEST_REPORT.md                  test results in simple English
├── CHANGES.md                      everything that changed in version 2
├── AUDIT_REPORT.md                 code audit
├── UPGRADES.md                     research and roadmap
└── vercel.json
```

## Research behind the design

- **One simple spending limit, not many small budgets.** Research found that splitting money into many small category budgets led people to overspend, justifying one category against another ([Think Forward Initiative](https://www.thinkforwardinitiative.com/research/budget-apps-might-they-actually-make-you-spend-more)). So FinCopilot leads with one number.
- **Pace, not just totals.** Simply checking a budget app often can increase spending ([BehavioralEconomics.com](https://www.behavioraleconomics.com/the-budgeting-app-trap-when-spending-information-backfires/)). So alerts compare your pace with your own usual month.
- **Reminders before due dates reduce missed loan payments.** Shown in a 13-million-person field experiment ([PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11789030/)). So EMIs due within 3 days are flagged, and autopay is one tap.
- **Older users need simplicity and trust.** Only about 15% of people over 55 in India use fintech regularly, citing complexity and fear of fraud ([Billcut](https://www.billcut.com/blogs/fintech-cultural-design-for-older-customers-making-apps-easier/)). Hence large text options, plain words, read aloud, and data that stays private.

More in [UPGRADES.md](UPGRADES.md).
