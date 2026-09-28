# FinCopilot

**Know what you can spend before you spend it.**

FinCopilot is an expense and EMI manager for people in India. Upload your PhonePe, Google Pay, Paytm or bank statements (or add expenses by hand), add your loans, and it tells you one simple thing: **how much you can spend without missing an EMI**, and what that means **per day until your salary**. It warns you when you are overspending, reminds you before EMIs are due, tracks your **real CIBIL score** (typed in or read from your free credit report PDF), plans **savings goals**, and has an AI assistant that runs on your own device.

**What makes it different from PhonePe, Paytm or Google Pay:** those apps help you *pay*. FinCopilot helps you *not overspend*. It works across all of them at once (upload their statements side by side), protects your EMIs first, needs no account or KYC, and keeps every rupee of your data on your own phone.

It is built to be easy for everyone, from a 20-year-old student to a 60-year-old first-time smartphone user: one big number, plain words, big buttons, a text-size setting, six colour themes and a "Read aloud" button.

> FinCopilot does not move money and is not a bank. It reads what you give it and helps you decide.

- **Live app:** https://fincopilot-jaya-siddharthas-projects.vercel.app
- **Try it in 5 seconds:** open the app and tap **Try it with sample data** (a made-up person with 4 months of history).
- **Test report (simple English):** [TEST_REPORT.md](TEST_REPORT.md) · **What changed:** [CHANGES.md](CHANGES.md) · **Audit:** [AUDIT_REPORT.md](AUDIT_REPORT.md)

| Home: safe to spend + per day | Your real CIBIL score | Savings goals |
|---|---|---|
| ![Home](docs/screenshots/mobile-home.png) | ![Credit score](docs/screenshots/mobile-credit-score.png) | ![Goals](docs/screenshots/mobile-goals.png) |

| Read your credit report PDF | Upload up to 5 statements | Your safety buffer |
|---|---|---|
| ![Add score](docs/screenshots/mobile-add-score.png) | ![Upload](docs/screenshots/mobile-upload.png) | ![Buffer](docs/screenshots/mobile-settings-buffer.png) |

| EMI calculator | Pay extra once (prepayment) | Ask the assistant |
|---|---|---|
| ![EMI calculator](docs/screenshots/mobile-emi-calculator.png) | ![Prepayment](docs/screenshots/mobile-prepayment.png) | ![Assistant](docs/screenshots/mobile-assistant.png) |

| Doomsday | Dark | Saffron | Ocean | Light |
|---|---|---|---|---|
| ![Doomsday](docs/screenshots/theme-doomsday.png) | ![Dark](docs/screenshots/theme-dark.png) | ![Saffron](docs/screenshots/theme-saffron.png) | ![Ocean](docs/screenshots/theme-ocean.png) | ![Light](docs/screenshots/theme-light.png) |

![Desktop home](docs/screenshots/desktop-home.png)

---

## Contents

1. [What it does](#what-it-does)
2. [How "safe to spend" works](#how-safe-to-spend-works)
3. [The offline AI](#the-offline-ai)
4. [Your CIBIL score](#your-cibil-score)
5. [Tech and architecture](#tech-and-architecture)
6. [Run it locally](#run-it-locally)
7. [Your data](#your-data)
8. [Tests](#tests)
9. [Deployment](#deployment)
10. [Project structure](#project-structure)
11. [Research behind the design](#research-behind-the-design)

---

## What it does

| Feature | What you get |
|---|---|
| **No sign-up** | Open the app and start. No login, no password, no account. Or tap **Try it with sample data** first. |
| **Simple setup** | Name, income and salary day → your bank balance → your safety buffer → your theme. Four short steps. |
| **Home** | One big "You can spend safely" figure, **"about ₹X a day until salary"**, your balance and how it was worked out, four big buttons, your next EMI, your credit score, tips and recent transactions. |
| **Upload statements** | Up to **5 files at once**: PhonePe, Google Pay, Paytm, BHIM or any bank, as **PDF (including password-locked), Excel (.xlsx) or CSV**. Files are read on your device. A preview lets you **tick or untick every transaction** and change its category. Duplicates (the same payment in two statements, or already saved) are found and unticked for you. |
| **Add by hand** | Money out or money in, with the category picked automatically from the description. |
| **Balance** | Worked out from your transactions: the last figure you confirmed with your bank, plus money in, minus money out. **Match with bank** resets it and tells you if something happened outside the app (cash, bank charges, other apps). |
| **Safety buffer (your choice)** | In Settings: switch it on or off, and pick ₹1,000 / ₹2,000 / ₹3,000 / ₹5,000 / 5% of income, or type any amount. |
| **EMIs** | Add loans, see what is due and what is late, mark as paid, **autopay** (records the EMI as paid automatically on its due date), months left and % repaid, and how much of your income goes to EMIs. |
| **EMI calculator** | Monthly EMI, total interest, a year-by-year schedule, whether it fits your income, and "Add as EMI". **Pay extra once** shows how much interest a bonus or lump sum saves and how many months sooner the loan ends. |
| **Your CIBIL score** | Type in your CIBIL, Experian, Equifax or CRIF score, or **upload the free credit report PDF** (even password-locked) and FinCopilot reads the score, date, active and overdue accounts on your device. See the history, the change since last time, and a reminder when it is over 6 months old. |
| **Savings goals** | "Emergency fund ₹1,00,000 by June": how much to put aside each month, a progress bar, and whether it fits what you usually have left at the end of a month. |
| **Stop overspending** | Spending-pace alert ("faster than usual this month"), category spikes, repeating payments (subscriptions), a 7-day balance forecast, a calendar of money in and out, and a "Can I afford it?" check. |
| **Credit health estimate** | A 300–900 estimate from your data with the six factors behind it, and a tip for each, shown next to your real score. Clearly labelled as an estimate. |
| **Assistant** | Ask in plain words ("What is my CIBIL score?", "How are my goals going?", "Can I afford 5000?"). Money decisions get exact answers from the calculator; open questions can use the **offline AI** that runs on your device. |
| **Works offline** | Once opened, the app installs itself and opens with no internet (a service worker keeps its files). |
| **Six themes and text size** | Purple (default), Light, Dark, Doomsday, Saffron, Ocean; Normal, Large or Extra large text. Remembered on your device. |
| **Private** | Everything is saved on your device (browser storage) and never sent to a server. **Download backup / Restore backup** moves it to another phone or computer. |

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
- **Per day:** safe to spend ÷ days until your next salary (or the end of the month if you did not set an income), rounded down, so spending that much each day never goes over.

The engine is [`frontend/src/lib/engine.js`](frontend/src/lib/engine.js). It runs on your device, so the screen updates instantly (about 20 ms) and works with thousands of transactions.

## The offline AI

The assistant can use a real language model, **Qwen 2.5 (Apache-2.0)**, running **inside your browser** with WebLLM and your graphics card (WebGPU). There is no API key, no account, and your questions never leave your device.

- **Smart** (about 1 GB) or **Lite** (about 400 MB). It downloads once, then works offline.
- It only knows what is in your own data, handed to it as a fact sheet with every question.
- **Money decisions** ("Can I afford…", loans, EMIs, safe to spend, credit score) are always answered by the exact calculator, not the model. The model handles open questions such as saving tips.
- **Any AI answer with a rupee amount that is not in your data is thrown away** and the exact figures are shown instead.
- Needs a browser with WebGPU (recent Chrome or Edge on a computer, some newer phones). Everywhere else the built-in assistant answers instantly.

Details and test results: [TEST_REPORT.md §5](TEST_REPORT.md#5-the-offline-ai).

## Your CIBIL score

**Why FinCopilot does not fetch your CIBIL score by itself:** credit bureaus (TransUnion CIBIL, Experian, Equifax, CRIF High Mark) only share scores with RBI-registered lenders and licensed partners, with your PAN and consent, under a paid business agreement. PhonePe, Paytm and Google Pay show a free score because they have that partnership. There is no free public API, and FinCopilot never asks for your PAN.

**What FinCopilot does instead (free and legal):**

1. By RBI rules, **each bureau gives you one free full credit report a year**. The Credit score page links to all four.
2. **Upload that PDF** (password-locked is fine). FinCopilot reads the score, the bureau, the report date, and the number of active and overdue accounts and enquiries, **on your device**. You check them, then save.
3. Or just **type in** a score you saw in any app.
4. You get a history chart, the change since last time, the band (Excellent 750+, Good 700+, Fair 650+, Needs work 550+, Poor), and the assistant uses your real score.

Tested with made-up reports in CIBIL, Experian, Equifax and CRIF layouts, "NH" (no history) reports and wrong passwords ([`creditReport.js`](frontend/src/lib/creditReport.js)).

### Credit health estimate

Next to your real score, FinCopilot shows an **estimate** on the same 300–900 scale, from what it can see, so you know what is helping or hurting:

| Factor | Weight |
|---|---|
| Paying EMIs on time (no late EMIs, no penalties) | 35% |
| Share of income going to EMIs (under 40% is healthy) | 25% |
| Saving each month | 15% |
| No bounced payments or penalty charges in statements | 10% |
| Length of history seen | 10% |
| Number of loans at once | 5% |

It is always labelled as an estimate. Automatic fetching through a licensed partner is described in [UPGRADES.md](UPGRADES.md).

## Tech and architecture

```text
Your phone or computer: everything runs here
┌──────────────────────────────────────────────────────────┐
│ Screens: Home, History, Insights, EMIs, Credit score,     │
│ Assistant, Settings                                       │
│ Money engine, statement and credit report reader, EMI     │
│ maths, goals, credit estimate                             │
│ Service worker: opens offline after the first visit       │
│ Offline AI: WebLLM + Qwen 2.5 on WebGPU                   │
│ Data: saved in the browser (localStorage), with backup    │
│ file download and restore                                 │
└──────────────────────────────────────────────────────────┘
Vercel only serves the app's files. No server, no database, no login.
```

| Part | Technology |
|---|---|
| App | React 18, Vite 8, Lucide icons, plain CSS with six themes |
| Data | Saved on the device (localStorage), all-or-nothing writes, JSON backup and restore |
| Statement reading | pdf.js (PDF, including locked files), Papa Parse (CSV), read-excel-file (.xlsx) |
| Offline AI | WebLLM running Qwen 2.5 Instruct (0.5B or 1.5B) on WebGPU |
| Tests | `node:test` unit tests + a seeded simulation, and an end-to-end robot in headless Chrome; GitHub Actions |
| Hosting | Vercel (static files only) |

Saving is "optimistic": the screen changes immediately, the data is saved in the background, and if saving fails the change is undone with a clear message.

## Run it locally

You need **Node.js 20.19+ or 22.12+**.

```bash
git clone https://github.com/Jaya-Siddhartha/AI-Financial-Copilot.git
cd AI-Financial-Copilot/frontend
npm install
npm run dev
```

Open http://localhost:5173.

Sample statements for trying the upload are in [`frontend/tests/fixtures`](frontend/tests/fixtures). The PhonePe sample's password is `9876543210`. `credit_report.pdf` is a made-up CIBIL-style report for a fictional person; its password is `ASHA1990`.

## Your data

- **No login.** FinCopilot opens straight to a four-step setup, then the dashboard.
- **Saved on this device** in the browser's storage. Nothing is sent to a server, and it works offline.
- **Backup:** Settings → Your data → **Download backup** saves a `.json` file. **Restore from a backup file** loads it on another phone or computer.
- **Clearing the browser's site data deletes FinCopilot data too**, so keep a backup.
- Every save is all-or-nothing: if the device is full, the change is undone and you are told why.
- **Cloud sync later:** the Supabase schema (with row-level security) is kept in [`supabase/migrations`](supabase/migrations) for when sign-in and sync across devices are wanted again.

## Tests

```bash
cd frontend
npm test                                  # 46 tests, including a 3,000-situation simulation (~15 s)
SIM_RUNS=20000 SIM_SEED=777 npm test      # the full simulation from the test report (~95 s)
npm run test:e2e                          # builds, then a robot uses every screen in headless Chrome (~25 s)
```

Latest full run: **719,526 simulation checks and 114 end-to-end checks, 0 failures.** See [TEST_REPORT.md](TEST_REPORT.md). GitHub Actions runs the tests, the build, the end-to-end robot and a security audit on every push.

## Deployment

The repo deploys to Vercel from `main` (`vercel.json` serves the `frontend` folder). The app is static files: no server, no database, no secret keys.

## Project structure

```
AI-Financial-Copilot/
├── frontend/
│   ├── src/
│   │   ├── App.jsx                 setup, navigation, instant saving, autopay
│   │   ├── config.js               app settings
│   │   ├── pages/                  Onboarding, Home, Activity (history), Insights, EMIs, Credit score, Assistant, Settings
│   │   ├── flows/                  sheets: transaction, EMI, mark paid, match with bank, upload, credit score, goal, confirm
│   │   ├── components/             charts (projection, donut, calendar, trend, credit gauge), goals card, theme picker, UI parts
│   │   ├── lib/                    engine, statement and credit report readers, categories, EMI maths, goals, credit estimate, advisor, sample data, offline AI
│   │   ├── data/store.js           on-device storage, backup and restore
│   │   └── styles/index.css        design system with six themes
│   ├── public/sw.js                offline support
│   └── tests/                      unit tests, simulation, end-to-end robot (e2e.mjs), sample statements and credit report
├── supabase/migrations/            optional cloud database schema, for future sync
├── docs/                           screenshots, latest simulation report
├── TEST_REPORT.md                  test results in simple English
├── CHANGES.md                      what changed in each version
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
