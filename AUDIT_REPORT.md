# FinCopilot: Audit Report

**Date:** 27 September 2026
**Scope:** entire repository (`backend/`, `frontend/`, `api/`, deployment config, docs, tests)
**Baseline audited:** commit `481da7d` (main)

---

## 1. Summary

FinCopilot's core idea works: two simulated UPI accounts, PIN-authorised payments between them, a balance "check" that sets a verified baseline, EMI tracking, and a deterministic safe-to-spend engine that classifies each account as SAFE, CAUTION or HIGH RISK. The original 15-scenario test script passed.

Under that happy path, though, the audit found **real defects**:

- **Payments went through without any UPI PIN.** The PIN was only checked if the client sent one.
- **Unlimited PIN guessing.** 20 wrong PINs in a row were all accepted as ordinary errors.
- **MongoDB mode was broken.** Payments, balance checks and PIN changes always wrote to the local JSON file, even when MongoDB was configured. On Vercel the DB connection was never opened at all.
- **The Insights page showed made-up numbers.** Its 30/60/90-day forecast used hard-coded values (`balance − 15,000` and so on) because of a data-shape bug.
- **Several EMI bugs.** A paid EMI never became due again, the same EMI could be paid twice, and EMI payments were filed under a category that doesn't exist.

All of these are fixed. The UI was rebuilt in a clean, mobile-first payment-app style (the layout pattern of apps like PhonePe), with no change to the product concept, the demo accounts or the API contract. Dead code, unused dependencies, committed runtime data and outdated docs were removed.

**Verdict:** working and verified locally, both through the API test suite and in a real browser on mobile and desktop. See §6 for what could **not** be verified: the deployment itself.

---

## 2. What was checked, and how

| Check | Method | Result |
|---|---|---|
| Dependencies install | `npm install` in `backend/`, `frontend/`, root | OK |
| Original test script (15 scenarios) | Ran against a live local server | 15/15 passed (baseline) |
| Suspected defects | Targeted `curl` requests against the running API | 8 confirmed (see §3) |
| New API test suite | `cd backend && npm test` (13 tests, node:test) | **13/13 pass** |
| Prediction engine scenarios | Formula recomputed by hand, SAFE → CAUTION → HIGH RISK → SAFE walk, simulator vs real payment at 6 amounts, 7-day and 30/60/90-day math | **25/25 pass** (after fix F11) |
| Frontend production build | `cd frontend && npm run build` | OK: 263 kB JS / 84 kB gzipped, 18 kB CSS |
| Full UI walkthrough | Playwright + Chromium, 390×844 phone and 1440×900 desktop | All flows pass (§5) |
| Layout at small width | 360 px viewport, every tab | No horizontal overflow |
| Browser console | During the whole walkthrough | No app errors. The only messages were a wrong-PIN 400 (intended) and Google Fonts blocked by the sandbox proxy |
| Dependency advisories | `npm audit` | Backend fixed to 0; frontend dev-server advisory open (§4.6) |
| Live deployment | `curl https://fincopilot-upi.vercel.app` | **Not reachable from this environment** (network policy) |

---

## 3. Findings

Severity: **High** means money, security or data integrity. **Medium** means wrong numbers or crashes. **Low** means hygiene or UX.

### 3.1 Backend

| # | Sev | Finding | Evidence | Status |
|---|---|---|---|---|
| B1 | High | A payment with no `upiPin` field succeeded and moved money. | `POST /transactions/payment` without PIN returned `success: true` | **Fixed.** PIN is required and must be 4 digits |
| B2 | High | No limit on wrong PIN attempts, so a 4-digit PIN could be brute-forced (10,000 tries). | 20 wrong attempts, all plain `400` | **Fixed.** 3 wrong attempts lock the PIN for 5 minutes (`423`), a correct PIN resets the counter, and Reset Demo clears it |
| B3 | High | Transfers, balance verification and PIN change always used the JSON file store, even with `MONGODB_URI` set. Reads came from MongoDB and writes went to the file, so balances diverged. | `dataService.transferBetweenAccounts` called `memoryStore` directly | **Fixed.** These now go through `dataService` and work on both stores |
| B4 | High | With the Vercel `services` entrypoint (`backend/src/server.js`), `connectDB()` was never called, so MongoDB could never be used in production. | `startServer()` is skipped when `VERCEL` is set | **Fixed.** `/api` middleware opens the cached connection on the first request |
| B5 | High | Any caller could delete any user's EMI by ID. | `DELETE /emi/emi_rahul_1` removed Rahul's EMI with no user check | **Fixed.** Ownership is checked; 404 otherwise |
| B6 | High | No authentication: any client can act as any `userId`. | By design for the demo | **Open.** See UPGRADES.md §1 |
| B7 | Med | Balance updates were read-then-write across `await`s, so concurrent requests could lose updates or overdraw. | `receiveMoney`, `payEMI` | **Fixed.** Atomic `adjustAccountBalance`: MongoDB `$inc` with a `currentBalance ≥ amount` guard; single synchronous step in the file store |
| B8 | Med | EMI payments were saved with category `"EMI"`, which isn't a real category (`"EMI & Loans"`). They didn't match the category filter. | `payEMI` response | **Fixed** |
| B9 | Med | An EMI marked paid stayed paid forever. Next month it never came due again. | `status` never reset | **Fixed.** Paid status lasts 25 days after payment, then the EMI is due again. Loans with 0 installments left show as closed |
| B10 | Med | The same EMI could be paid repeatedly in one cycle. | — | **Fixed.** Returns `400` |
| B11 | Med | Creating an EMI without a name crashed with a 500. | `Cannot read properties of undefined (reading 'trim')` | **Fixed.** `400` with a clear message |
| B12 | Med | Every record got two different random IDs (`_id` ≠ `id`). | `generateId()` called twice | **Fixed.** One ID per record |
| B13 | Med | Recipient matching used substring rules, so any name containing a demo user's name credited that account. | `recipientName.includes(u.name)` | **Fixed.** Exact match on phone, UPI ID, or full name |
| B14 | Med | MongoDB search passed raw user input as a regex (regex injection / ReDoS). | `$regex: query.search` | **Fixed.** Input escaped |
| B15 | Med | Any string was accepted as a transaction category. | `PATCH` with `<script>` stored it | **Fixed.** Must be one of the 12 canonical categories |
| B16 | Med | No sensible amount rules: ₹0.001 was accepted and there was no per-payment cap. | `receive` with `0.001` succeeded | **Fixed.** Rounded to paise; UPI payments capped at ₹1,00,000 (NPCI P2P limit) |
| B17 | Med | 30/60/90-day forecast subtracted a fixed ₹10,000 rent for everyone. Rahul pays no rent. | `monthlyHousing = 10000` | **Fixed.** Uses rent actually seen in the ledger |
| B18 | Med | An EMI due today was reported as due in 10 days (`daysRemaining \|\| 10`). | `accountController` | **Fixed** (`??`) |
| B19 | Low | A due day of 29 to 31 was miscounted in shorter months. | `getDaysUntil` | **Fixed.** Clamped to the month's length |
| B20 | Low | `limit=abc` returned an unbounded list. | — | **Fixed.** Clamped to 1 to 500 |
| B21 | Low | Payment errors all returned `400`, even server faults. | — | **Fixed.** Correct status per error |
| B22 | Low | Importing `server.js` started a listener as a side effect (made testing hard). | — | **Fixed.** Starts only when run directly |
| B23 | Low | Payment notes were dropped. | — | **Fixed.** Stored as the transaction description |

### 3.2 Frontend

| # | Sev | Finding | Status |
|---|---|---|---|
| F1 | High | The Insights forecast cards showed invented numbers (`balance − 15000/28000/42000`, "CAUTION"). It read `horizons.d30` from what is actually an array. | **Fixed.** Real backend forecasts |
| F2 | Med | The what-if simulator re-implemented the engine using only the 10 most recent transactions, so its numbers disagreed with the dashboard. It also showed a literal `($\Delta$)`; its "Potential EMI Default" branch could never trigger (`safeToSpend` is clamped ≥ 0); and its "EMI Due" badge used a field that doesn't exist. | **Fixed.** `lib/affordability.js` reuses the backend's own metrics |
| F3 | Med | The payment receipt showed a random `TXN-######` instead of the real transaction ID. | **Fixed** |
| F4 | Med | Receive Money sent categories that don't exist (`Freelance / Bonus`, `Salary`, `Investments & Savings`, `Other`). | **Fixed** |
| F5 | Med | The Check Balance header always said "HDFC Bank •••• 4092", because the account was never passed in. | **Fixed** |
| F6 | Low | Category icons were keyed on names that don't exist, so most rows showed a generic tag icon. | **Fixed** |
| F7 | Low | Browser `window.confirm` / `alert` dialogs. | **Replaced** with in-app sheets and toasts |
| F8 | Low | Not usable on phones: fixed 260 px sidebar, a header with six buttons, tables that scroll sideways. | **Rebuilt** mobile-first |
| F9 | Low | Dead code: `OnboardingModal` (imported, never shown), two placeholder pages, `SpendingChart` (dark-theme leftover with white text on white), `StartPage` marketing page. | **Removed** |
| F10 | Low | Unused dependencies: `chart.js`, `react-chartjs-2`, `clsx`. | **Removed** |
| F11 | Med | The "Can I afford it?" simulator and the pay-screen warning disagreed with the dashboard after the payment was made. Example: ₹20,000 was predicted **SAFE (₹4,400 left)** but became **HIGH RISK (₹0)** once paid. The engine adds each payment to the spending behind the daily burn rate; the simulator didn't. | **Fixed.** The simulator now uses the engine's `discretionarySpend` and matches the post-payment dashboard exactly (API test 13) |

### 3.3 Repository and deployment

| # | Sev | Finding | Status |
|---|---|---|---|
| R1 | Med | A backup JSON with user records, **including UPI PINs**, was committed (`backend/backups/`). | **Removed**, and the folder is now git-ignored. It remains in git history |
| R2 | Low | `backend/data/db.json` was tracked despite `.gitignore`, so every run dirtied the working tree. | **Untracked** |
| R3 | Low | `frontend/dist/index.html` was committed and pointed at asset files that weren't in the repo. | **Removed** |
| R4 | Low | Test scripts needed a manually started server and always exited with code 0, even on failure. | **Replaced** by `npm test` (self-contained, fails properly) |
| R5 | Low | Old reports (`FINCOPILOT_COMPLETE_AUDIT.md`, `FINCOPILOT_UPGRADE_REPORT.md`) linked to local Windows paths (`file:///n:/...`), contained raw LaTeX, and claimed "100% verified". | **Replaced** by this report and UPGRADES.md |
| R6 | Low | README documented endpoints that don't exist (`POST /api/account/setup`, `POST /api/transactions`). | **Rewritten** |
| R7 | Med | Backend dependency advisory: `qs` (moderate, 2 advisories) via Express. | **Fixed** (`npm audit fix`, lockfile only) |
| R8 | Low | Frontend dev-server advisory: `esbuild ≤ 0.24.2` via Vite 5 (affects `npm run dev` only, not the built site). | **Open.** Needs a major Vite upgrade (UPGRADES.md §6) |

### 3.4 Still open (by design or out of scope)

| Area | Note |
|---|---|
| Authentication | None. Any client can use any `userId`. Fine for a public demo, not for real users. |
| UPI PIN storage | Stored in plain text. Real apps never see the PIN; it is encrypted on-device by NPCI's library and verified by the bank. |
| Data on Vercel | Without `MONGODB_URI`, data lives in `/tmp` per function instance. Different instances can show different balances, and data resets on cold start. Set `MONGODB_URI` for a stable demo. |
| CORS | Open to every origin (`cors()`). |
| Rate limiting | Only the PIN lockout. There is no general request limit. |
| Burn-rate model | Daily spending = all discretionary debits ÷ 30 (minimum ₹300), with no date window. A one-off purchase is treated as if it repeats daily until the EMI: after a ₹20,000 purchase, "expected daily spending" jumps from ₹3,600 to ₹11,196. The formula was kept unchanged on request. See UPGRADES.md §2 P2 for the fix (dated window, trimmed mean). |
| Seed data | Siddhartha's seeded balance (₹50,000) doesn't reconcile with the seeded transactions (+₹50,000 salary, −₹18,000 spending). Cosmetic for a demo. |
| `api/index.js` + root `package.json` deps | Probably unused with the `services` config in `vercel.json`, but left untouched because the deployment couldn't be inspected. |

---

## 4. Changes made

### 4.1 UI/UX redesign

The whole frontend was rebuilt in the style of a mainstream UPI app: a simple, professional, payment-first layout.

- **Layout:** purple top bar with profile and UPI ID. A bottom tab bar on phones (Home, Insights, **Pay**, EMIs, History) and a sidebar on desktop.
- **Home:** a "Safe to spend" summary card (with Balance, EMIs due and next salary), a *Transfer money* icon grid (To mobile number, To UPI ID, Receive money, Check balance), a *Loans & planning* grid, a *People* row, and the current status, upcoming EMIs and recent transactions.
- **Pay flow**, the way users expect it: pick a contact or type a number/UPI ID → amount screen with a big centred amount, quick amounts, a note and the paying bank account → **UPI PIN keypad** → success screen with the real transaction ID.
- **The product's key value is now visible at the moment of payment:** while you type an amount, the pay screen says whether it's safe, whether your buffer gets thin, or exactly how much you'd be short for which EMI.
- Sheets (bottom sheets on phones, dialogs on desktop) replace browser popups.
- **Icons:** one set (Lucide) at one stroke weight, in consistent purple tiles. No emojis, no "sparkle"/AI decoration, no gradients.
- **Copy:** plain language. "At risk" instead of "HIGH RISK Shortfall Warning"; "Safe to spend" instead of "AI Calculated Available Safe-to-Spend".
- **Accessibility:** labelled inputs, `aria` roles on dialogs, tabs and status, visible focus rings, `prefers-reduced-motion` respected.
- **New, using existing APIs:** Change UPI PIN (the API existed but had no UI), Remove EMI, CSV statement download, transaction detail sheet.

### 4.2 Removed

`frontend/src/components/*` (13 old components), `frontend/src/pages/*` (8 old pages including two placeholders and the start page), `services/predictionEngine.js`, `frontend/dist/`, `chart.js`, `react-chartjs-2`, `clsx`, `backend/test_all_15_cases.js`, `backend/test_e2e.js`, `backend/backups/*.json`, `backend/data/db.json` (untracked), and the two old report files. Frontend source went from about 6,650 lines to about 3,900.

### 4.3 Unchanged, on purpose

The product concept, the two demo accounts and their numbers, demo PIN `1234`, the safe-to-spend formula, the risk tiers, every API route and response shape, the MongoDB and JSON storage options, and `vercel.json`.

---

## 5. Verification detail

**API tests** (`backend/tests/api.test.js`, all passing):

1. Health endpoint
2. Full demo scenario (the original 15 cases): both accounts load; bad mobile number and wrong PIN are rejected; a transfer moves ₹5,000 between the accounts; checking balance sets the baseline; later payments change the estimate but not the baseline; adding an EMI raises obligations; a large payment gives HIGH RISK; receiving money restores SAFE; paying the EMI records an "EMI & Loans" debit and refuses a second payment; reset restores the demo
3. Payment without a PIN is refused
4. Negative, non-numeric, over-limit and over-balance amounts are refused
5. PIN locks after 3 wrong attempts, even the right PIN is refused while locked, and reset clears the lock
6. A correct PIN clears earlier wrong attempts
7. UPI PIN can be changed and the new PIN works
8. An EMI can't be deleted through another user
9. EMI input validation
10. Category whitelist, and `_id === id`
11. A partial-name payment doesn't credit a demo account
12. The forecast uses rent from the ledger
13. The affordability simulator predicts status, safe-to-spend and burn rate after a real payment

**Browser walkthrough** (Playwright, Chromium): load home → pay by mobile number (auto-matched to Rahul) with a note → wrong PIN shows "2 attempts left" → correct PIN gives the success screen → a large amount shows the EMI shortfall warning → check balance → receive money → Insights what-if → add EMI → pay EMI → history search and category change → switch to Rahul → change PIN → desktop home, insights, history and pay dialog → 360 px overflow check on every tab.

Screenshots are in `docs/screenshots/`.

---

## 6. Deployment status

- **Not deployed from this session.** The session's network policy blocks `*.vercel.app` and `api.vercel.com`, and no Vercel token is configured. The live URL couldn't be opened to verify it either.
- The repo is deployable as-is with the existing `vercel.json`. If the Vercel project is connected to GitHub, pushing this branch creates a **preview deployment** and merging to `main` updates production.
- To deploy manually: `npm i -g vercel && vercel --prod` from the repo root. Optionally set `MONGODB_URI` in the Vercel project settings so data persists across function instances.
- After deploying, check: `GET /api/health` returns `online`; the home page loads; a ₹1 payment with PIN `1234` succeeds.
