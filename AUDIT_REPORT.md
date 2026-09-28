# FinCopilot: Full Project Audit

**Date:** 28 September 2026
**Baseline audited:** commit `19a3aaf` (`main`)
**Scope:** every tracked file: `backend/`, `frontend/`, `api/`, `vercel.json`, docs, tests and dependencies
**Audited by:** a full read of the source (about 7,000 lines), a live run of the app, targeted API probes, the test suite, a production build and dependency scans

---

## Contents

1. [Summary](#1-summary)
2. [How the audit was done](#2-how-the-audit-was-done)
3. [How the project is built](#3-how-the-project-is-built)
4. [Findings](#4-findings)
   - 4.1 [Security and access control](#41-security-and-access-control)
   - 4.2 [Money movement and data integrity](#42-money-movement-and-data-integrity)
   - 4.3 [The financial engine (safe to spend)](#43-the-financial-engine-safe-to-spend)
   - 4.4 [User experience](#44-user-experience)
   - 4.5 [Accessibility](#45-accessibility)
   - 4.6 [Engineering, tests and deployment](#46-engineering-tests-and-deployment)
5. [What already works well](#5-what-already-works-well)
6. [Verification results](#6-verification-results)
7. [Fix plan and status](#7-fix-plan-and-status)
8. [Changes made after this audit](#8-changes-made-after-this-audit)

---

## 1. Summary

FinCopilot is a demo UPI wallet with one idea no mainstream payment app offers: before you pay, it tells you whether you can still cover your upcoming EMIs. The idea works. The engine is deterministic and explainable, the 13 API tests pass, the production build is clean, and the earlier audit's high-severity bugs (payments without a PIN, PIN brute force, broken MongoDB mode, fake forecasts) are really fixed.

This audit found **46 issues** (4 High, 20 Medium, 22 Low). None of them crash the app in normal use. The important ones are:

| Area | Most serious finding |
|---|---|
| Security | **EMI payments move money without a UPI PIN** (S3), even though the app says "every payment needs your UPI PIN". Any caller can also change another user's transaction category (S4) and credit any amount to any account (S2). |
| Data integrity | A transfer is four separate writes with nothing tying them together (B1). If the process stops between the debit and the credit, money disappears. A half-written `db.json` is silently replaced by an empty store (B2). |
| Engine | The daily-spending rate uses the last 100 transactions whatever their dates (E1), the 30/60/90-day outlook hides deficits by rounding them up to ₹0 (E2), and a missed EMI simply shows "Due in 29 days" (E5). |
| Usability | Text is fixed in pixels, with 23 styles at 11–13 px (A1). Grey helper text fails contrast (A2). Charts are hard to read (U4). There is no dark theme, no text-size control and no plain-language help for new users (U1–U3). |
| Tooling | The dev server restarts on every payment because `nodemon` watches the data file (B3). The frontend's Vite version has a published advisory (S13). |

**Verdict:** a solid demo with a clear idea and honest numbers, but not safe for real users yet. **Authentication (S1) remains the one blocker** before real money is involved. Every other finding has a small, local fix. §8 lists what was fixed in the same working session: 31 findings fixed, 2 partly.

---

## 2. How the audit was done

| Check | Method | Result |
|---|---|---|
| Source review | Every file under `backend/src`, `frontend/src`, `api/`, config and docs was read in full | 46 findings (§4) |
| Install | `npm install` in root, `backend/`, `frontend/` on Node 22.23 | OK |
| Run locally | `npm run dev` (Express on :5000, Vite on :5173), then used in the browser | Works. Dev server restarted itself after data writes (B3) |
| API probes | 8 targeted `curl` requests against the running server | 7 defects confirmed (S2, S3, S4, S6, S7, S9, B3) |
| API test suite | `cd backend && npm test` (node:test, 13 tests) | **13/13 pass** |
| Production build | `cd frontend && npm run build` | OK: 264 kB JS (84 kB gzipped), 18 kB CSS |
| Dependency advisories | `npm audit` in both packages | Backend 0. Frontend 2 (esbuild/vite dev server, S13) |
| Outdated packages | `npm outdated` | React 18 → 19, Vite 5 → 8, Express 4 → 5, Mongoose 8 → 9 available |
| Contrast | WCAG ratio computed for every text colour token | `--text-3` is 3.42:1 on white, 3.06:1 on the page background (fails AA, A2) |
| Market comparison | Web research on 2026 UPI features, fintech UX and designing for older users | See [UPGRADES.md](UPGRADES.md) |

**Evidence for the confirmed API defects** (all against a fresh reset):

```text
1) POST /emi/:id/pay            {"userId":"user_siddhartha"}                      → success, ₹20,000 debited, no PIN
2) PATCH /transactions/:id/category (Rahul's tx, no userId)                       → success
3) POST /transactions/receive   {"userId":"user_rahul","amount":999999, ...}      → success, ₹9,99,999 credited
4) GET /account/dashboard?userId=user_rahul                                       → full data for another user
5) POST /account/update-pin     {"oldPin":"1234","newPin":"1234"}                 → success (PIN "changed" to itself)
6) POST /emi                    {"name":"A"×3000,"frequency":"Hourly",...}        → success
8) GET /api/health                                                                → Access-Control-Allow-Origin: *, no security headers
   next request after a write                                                     → curl exit 56 (server restarting, B3)
```

---

## 3. How the project is built

```text
Browser (React 18 + Vite 5)                      Express 4 API (Node 22)                  Storage
┌────────────────────────────┐   /api/*   ┌──────────────────────────────┐   ┌────────────────────────┐
│ App.jsx (tabs + sheets)    │ ─────────► │ routes → controllers         │   │ MongoDB (if MONGODB_URI)│
│ pages/  Home Insights EMIs │  axios     │ dataService (store switch)   │ ─►│   or                    │
│         History Profile    │            │ financialEngine (pure)       │   │ backend/data/db.json    │
│ flows/  Pay PIN Balance …  │ ◄───────── │ seedService / seedData       │   │ (/tmp on Vercel)        │
│ lib/affordability (mirror) │   JSON     └──────────────────────────────┘   └────────────────────────┘
└────────────────────────────┘
            │ demo build only
            ▼
 services/browserApi.js: the same API answered inside the page (localStorage), reusing
 the backend engine, categories and seed data.
```

| Layer | Files | Lines | Notes |
|---|---|---|---|
| API entry and config | `server.js`, `config/db.js`, `config/store.js`, `api/index.js` | 500 | Mongo connection is cached for serverless. The JSON store rewrites the whole file on every change |
| Controllers and routes | 3 controllers, 3 routers | 720 | `userId` comes from the query or body (no sessions) |
| Services | `dataService.js`, `financialEngine.js`, `seedData.js`, `seedService.js` | 990 | Engine is pure apart from `new Date()` |
| Models | `User`, `Account`, `Transaction`, `EMI` | 300 | String `_id` so the same IDs work in both stores |
| Frontend app | `App.jsx`, 5 pages, 9 flows, 8 UI components | 2,150 | No router; tab state and a sheet stack |
| Frontend logic | `lib/format.js`, `lib/affordability.js`, `services/api.js` | 150 | `affordability.js` mirrors the engine for instant "what if" |
| Browser demo API | `services/browserApi.js` | 512 | A second copy of the controller logic (B8) |
| Styles | `styles/index.css` | 1,537 | One hand-written file, CSS variables, light theme only |
| Tests | `backend/tests/api.test.js` | 246 | 13 end-to-end API tests on a temporary JSON store |

**The core calculation** (`financialEngine.js:146-153`):

```text
daily spending   = max(₹300, non-fixed debits in the loaded transactions ÷ 30)
expected spend   = daily spending × days until the next EMI
safe to spend    = balance − all unpaid EMIs − expected spend − ₹2,000 buffer   (never below 0)
status           = HIGH RISK  if balance < EMIs + expected spend
                   CAUTION    if balance < EMIs + expected spend + buffer
                   SAFE       otherwise, or if no EMI is unpaid
```

---

## 4. Findings

**Severity.** **High**: money can move or data can be lost or exposed. **Medium**: wrong numbers, misleading UI, or a real barrier for some users. **Low**: hygiene, polish or future risk.

### 4.1 Security and access control

| # | Sev | Finding | Evidence | Impact | Recommendation |
|---|---|---|---|---|---|
| S1 | High | **No authentication.** Every endpoint trusts the `userId` in the query or body. Anyone who can reach the API can read or act on any account. | `accountController.js:46,86`, `transactionController.js:17`, probe 4 | Complete account takeover once real users exist | Phone + OTP login with a session. Derive `userId` on the server and ignore it from the client. Needed before any real user (see UPGRADES.md P0) |
| S2 | High | **`POST /transactions/receive` credits any amount (up to ₹10 lakh) to any account**, with no PIN and no check. | `transactionController.js:146-211`, probe 3 | Anyone can inflate a balance, which also corrupts safe-to-spend | Keep it as a demo simulator only. Put it behind a demo flag and authentication, and cap the amount lower |
| S3 | High | **EMI payments need no UPI PIN.** `POST /emi/:id/pay` debits the account directly, and the Pay EMI screen has no PIN step, while Profile says "Every payment needs your 4-digit UPI PIN". | `emiController.js:84-156`, `PayEmiSheet.jsx:15-27`, probe 1 | Money leaves the account without the user's approval. The UI makes a false promise | Require and check the PIN (with the same lockout) in the API. Add the PIN pad to the Pay EMI flow |
| S4 | Medium | **Any transaction's category can be changed by anyone.** No owner check. | `transactionController.js:214-237`, probe 2 | Another user's insights can be manipulated | Require `userId` and check that the transaction belongs to that user; return 404 otherwise |
| S5 | Medium | UPI PINs are stored in plain text, and if a user has no PIN, `1234` is silently accepted. | `User.js:37-40`, `store.js:88`, `dataService.js:195` | A data leak exposes every PIN | Hash with `scrypt`/`bcrypt`. Remove the `'1234'` fallback in the check. (Real UPI apps never see the PIN at all; see UPGRADES.md) |
| S6 | Medium | The new PIN may equal the old one. The old PIN is only checked after the user has typed all three PINs. | `dataService.js:327-340`, `ChangePinFlow.jsx:60-72`, probe 5 | "PIN changed" when nothing changed. Users type 12 digits before learning the first 4 were wrong | Reject `newPin === oldPin`. Verify the current PIN first (a verify endpoint), or at least say which step failed |
| S7 | Medium | CORS allows every origin, and no security headers are sent (`X-Content-Type-Options`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`). | `server.js:20`, probe 8 | Any website can script the API from a visitor's browser. The app can be framed (clickjacking) | Allow-list origins through an env var. Add the standard headers (or `helmet`) |
| S8 | Medium | No rate limit on any endpoint, and `POST /account/reset` is public. | `accountRoutes.js:18` | Anyone can wipe all data in a loop, or flood the JSON store | Rate-limit per IP; restrict reset to demo mode |
| S9 | Low | No length or value limits on names and enums: a 3,000-character EMI name and `frequency: "Hourly"` are accepted. `paymentMethod` is stored as free text. | `emiController.js:33-71`, `transactionController.js:57-66`, probe 6 | Data pollution and oversized documents. (React escapes output, so this is not XSS) | Trim and cap strings (e.g. 60 chars). Whitelist `frequency` and `paymentMethod` |
| S10 | Medium | **CSV formula injection in the statement download.** Values are quoted but not neutralised, so a sender named `=HYPERLINK(...)` becomes a live formula in Excel. | `HistoryPage.jsx:15-24` (sender names come from S2) | A crafted name can run a formula when the statement is opened | Prefix cells starting with `= + - @` (and tab/CR) with `'` |
| S11 | Low | 500 responses return the raw `error.message` (e.g. Mongoose internals). | every controller's `catch` | Leaks internals to callers | Log the detail; return a generic message for unexpected errors |
| S12 | Low | IDs come from `Math.random()` plus a timestamp. | `store.js:56`, `browserApi.js:26` | Predictable transaction IDs | Use `crypto.randomUUID()` |
| S13 | Medium | The frontend's Vite 5.4 / esbuild ≤ 0.24.2 has a published advisory: any website can send requests to the dev server and read the responses (GHSA-67mh-4wv8-2f99). | `npm audit` in `frontend/` | Affects developers running `npm run dev`, not the production build | Upgrade Vite (and `@vitejs/plugin-react`) to a fixed major |

### 4.2 Money movement and data integrity

| # | Sev | Finding | Evidence | Impact | Recommendation |
|---|---|---|---|---|---|
| B1 | High | **Transfers are not atomic.** Debit sender → write sender's ledger entry → credit recipient → write recipient's entry are four independent writes. EMI payment and receive are the same (two or three writes). | `dataService.js:239-288`, `emiController.js:108-141` | A crash or timeout mid-way leaves money debited but never credited, or a balance without a ledger entry | With MongoDB, use a session transaction (needs a replica set, which Atlas provides). With the JSON store, apply all changes to one loaded object and save once |
| B2 | Medium | **The JSON store can silently wipe all data.** It reads and rewrites the whole file synchronously on every operation, not atomically. If `db.json` is ever half-written, `loadData()` logs an error and returns an empty store, and the next dashboard request re-seeds the demo. | `store.js:31-54`, `accountController.js:89-92` | Silent data loss after a crash during a write. Every request blocks the event loop while the file is parsed | Write to a temp file and `rename` it over the original. On a parse error, keep the broken file aside instead of starting empty. Long term, use MongoDB only |
| B3 | Medium | **The dev server restarts on every write.** `nodemon` watches all files, including `backend/data/db.json`, so each payment restarts the API and drops in-flight requests. | `backend/package.json:9`, observed in the dev log and as `curl` exit 56 | Random "Cannot reach the server" errors during local testing | Add a `nodemon.json` that ignores `data/` and `backups/` |
| B4 | Medium | No idempotency for payments. A retried request on a slow network pays twice. | `transactionController.js:54` | Double payment | Client sends an `Idempotency-Key`; the server stores it and replays the first result |
| B5 | Low | Recipients are matched by exact name as well as phone/UPI ID, and the first match wins. | `dataService.js:230-237` | With real users, two people with the same name could receive each other's money | Match only on phone number or UPI ID |
| B6 | Low | API responses invent values when data is missing (mobile `+91 9876543210`, balance `50000`, bank `HDFC Bank`). | `accountController.js:22-28,67-69,121-131` | Hides data problems behind plausible numbers | Return what is stored; let the UI show "unknown" |
| B7 | Low | `api/index.js` is not used by the current `vercel.json` (which routes `/api` to the `backend` service's `src/server.js`). | `vercel.json:6-9` | Confusion about which entry point runs in production | Delete it, or document which config uses it |
| B8 | Low | `browserApi.js` re-implements every controller (512 lines). | `frontend/src/services/browserApi.js` | Any rule added to the server must be added twice or the demo drifts | Keep running the API tests against it (already documented). Longer term, share one handler module |

### 4.3 The financial engine (safe to spend)

| # | Sev | Finding | Evidence | Impact | Recommendation |
|---|---|---|---|---|---|
| E1 | Medium | **The daily-spending rate ignores dates.** It sums non-fixed debits from the last 100 transactions and divides by 30, even if those transactions span six months. | `financialEngine.js:98-148`, `accountController.js:102` | For long-time users the rate, and so safe-to-spend, is badly wrong (six months of spending read as one) | Only count debits from the last 30 days. Mirror the change in `lib/affordability.js` |
| E2 | Medium | **The 30/60/90-day outlook hides deficits.** Ending balances below zero are shown as ₹0. Rent is taken from every housing payment loaded, not per month. | `financialEngine.js:233-259` | "₹0 in 60 days" looks fine when the real answer is "₹18,000 short" | Return the signed value and show shortfalls in red. Use last-30-day rent |
| E3 | Low | The 7-day projection only deducts an EMI when the day-of-month equals `dueDay` exactly. An EMI due on the 31st is never deducted in a 30-day month, even though `getDaysUntil` treats it as due on the 30th. | `financialEngine.js:201-206` vs `:5-15` | Chart and countdown disagree at month end | Clamp `dueDay` to the month's length in the projection too |
| E4 | Medium | **No "overdue" state.** When an unpaid EMI's due day passes, it just rolls to "Due in 29 days". The model's `overdue` status is never set. | `financialEngine.js:29-62`, `EMI.js:60` | A missed loan payment, which costs penalties and hurts the credit score, disappears from view | If an EMI's due date this month has passed and it was not paid this cycle, mark it **Overdue**, count it as due now, and warn about it first |
| E5 | Low | Salary is not used in safe-to-spend. Every unpaid EMI is counted even if salary arrives first. | `financialEngine.js:152` | Conservative (safe side) but sometimes too cautious | Document it in the UI now; model a salary-aware timeline later (UPGRADES.md P2) |
| E6 | Low | The ₹2,000 buffer and ₹300/day floor are fixed for every income level. | `financialEngine.js:148-150` | ₹2,000 is a lot for a ₹15k earner and little for ₹2 lakh | Make the buffer a user setting, defaulting to a share of income |
| E7 | Low | The engine returns hex colours for the timeline. | `financialEngine.js:272,283` | Presentation inside business logic; breaks theming | Return a type only; colour in the UI |

### 4.4 User experience

| # | Sev | Finding | Evidence | Impact | Recommendation |
|---|---|---|---|---|---|
| U1 | Medium | **Jargon without help.** "EMI", "UPI", "cycle", "buffer", "At risk", "Outlook" are never explained. Nothing tells a first-time user what the big number on the home screen means. | `HomePage.jsx`, `InsightsPage.jsx` | Older or first-time users cannot tell what to do. A KPMG India survey (2025) found only 15% of people over 55 use fintech apps regularly, citing complexity and fear of fraud | Plain-language labels ("Money you can spend safely"), a one-line explanation under each figure, and tap-to-explain help |
| U2 | Medium | Only a light theme. No dark mode, no text-size control. | `index.css:3-37` | Users who need bigger text or darker screens cannot get them | Theme tokens for dark and light, plus a text-size setting stored per device |
| U3 | Medium | **The pay screen warns but never stops.** A HIGH RISK payment gets a red note, but "Pay" works exactly as for a safe one. There is no warning for a first-time payee. | `PayFlow.jsx:216-226` | The app's key promise (protect my EMI) is easy to miss. Paying new, unknown payees is the main scam pattern NPCI warns about | Ask "Pay anyway?" for HIGH RISK payments. Show a "New payee, check the name" note for people you have never paid |
| U4 | Medium | **Charts are hard to read.** The 7-day view is CSS bars labelled "43k" with no line for the EMI amount. Categories have no percentages. There is no calendar of what is due when. | `InsightsPage.jsx:15-22,133-173` | The forecast, the product's main visual, does not show where the danger line is | A line/area chart with the EMI line marked, a donut with percentages, and a money calendar (salary and EMIs on dates) |
| U5 | Low | You can close a payment sheet while it is being processed. Sheets do not trap or restore keyboard focus. | `Sheet.jsx:5-37` | Unclear state after closing mid-payment; keyboard users lose their place | Block closing while busy; move focus into the sheet and back afterwards |
| U6 | Low | On phones, Profile (switch account, change PIN, reset) is only reachable by tapping the name in the top bar. | `App.jsx:297-316` | Hard to find | Add Profile/More to the bottom bar, or label the avatar button |
| U7 | Low | No "My QR" to receive money, and the app cannot be installed (no web manifest). | `ReceiveSheet.jsx`, `index.html` | Missing two things every UPI user expects | Show a UPI QR (`upi://pay?pa=…`) in Receive; add a manifest |
| U8 | Low | The "Can I afford it?" input allows 7 digits but the slider only reaches the balance; above-balance amounts are silently clamped. | `InsightsPage.jsx:10,92` | Typed amount and result disagree without saying so | Say "More than your balance" instead of clamping silently |

### 4.5 Accessibility

| # | Sev | Finding | Evidence | Impact | Recommendation |
|---|---|---|---|---|---|
| A1 | Medium | **All text sizes are fixed pixels.** Body is 15 px and 23 rules are 11–13 px. The browser's "larger text" setting is ignored. | `index.css:57`, 23 matches of `font-size: 1[1-3]px` | Hard to read for older users and anyone with low vision (WCAG 1.4.4) | Use `rem` with a 16 px base, no text under 12 px, and a user text-size setting |
| A2 | Medium | **Helper text fails contrast.** `--text-3` `#8a8a94` is 3.42:1 on white and 3.06:1 on the page background (AA needs 4.5:1). It is used for dates, hints and sub-labels. | `index.css:20` | The small grey text is the hardest to read and carries dates and explanations | Raise all text tokens to at least 4.5:1 |
| A3 | Low | Charts expose data only through `title` tooltips (mouse only). | `InsightsPage.jsx:135-147` | Screen-reader and touch users cannot read exact values | Add a visually hidden table or per-point labels |
| A4 | Low | PIN entry progress is not announced (no live region), and the wrong-PIN error is inside a component that re-mounts. | `PinPad.jsx:39-49` | Screen-reader users do not know digits were accepted | `aria-live="polite"` on the progress text |

### 4.6 Engineering, tests and deployment

| # | Sev | Finding | Evidence | Impact | Recommendation |
|---|---|---|---|---|---|
| D1 | Medium | No CI. Tests and the build only run when someone remembers. | no `.github/workflows` | Regressions reach `main` unnoticed | A GitHub Actions workflow: backend tests + frontend build on every push and PR |
| D2 | Low | No frontend tests and no linter config. | `frontend/package.json` | UI regressions (like a broken pay flow) are only caught by hand | Add ESLint and a few component or Playwright smoke tests |
| D3 | Low | The engine calls `new Date()` itself, so date edge cases (month end, 31st, leap year) cannot be unit tested. | `financialEngine.js:194,225` | Bugs like E3 slip through | Accept `now` as a parameter (default `new Date()`) |
| D4 | Low | On Vercel without `MONGODB_URI`, data lives in each instance's `/tmp`, so different requests can see different balances. Documented in the README, but not enforced. | `store.js:7-10` | Confusing demo behaviour in production | Show a "demo storage" banner, or refuse to start in production without a database |
| D5 | Low | Dependencies are one or more majors behind (React 19, Express 5, Mongoose 9, Vite 8). | `npm outdated` | Security fixes and features land only in new majors over time | Plan upgrades one major at a time, after CI exists |
| D6 | Low | Screenshots in `docs/screenshots` show the old design once the UI changes. | `docs/screenshots/*.png` | README misleads | Retake them with each visual change |
| D7 | Low | `npm run build:demo` fails on Windows: the script turns `import.meta.url` into `/N:/…` with `URL.pathname`. Found while fixing. | `frontend/scripts/build-demo.mjs:8` | The single-file demo cannot be built on Windows | Use `fileURLToPath` |

---

## 5. What already works well

- **An honest, explainable engine.** Every figure on the Insights page is shown with its formula, and the pay-screen prediction matches the dashboard after a real payment (covered by a test).
- **Real UPI-style protection on transfers.** A 4-digit PIN is required, three wrong tries lock it for five minutes, and the per-transaction limit is ₹1,00,000, matching NPCI's P2P limit.
- **Both storage modes work.** Transfers, balance checks and PIN changes go through `dataService` and behave the same on MongoDB and the JSON store, including an atomic "debit only if funds cover it" check.
- **Useful tests.** 13 end-to-end tests cover the full demo scenario, PIN rules, limits, EMI ownership, category whitelist and the forecast.
- **A clear, mobile-first UI.** A bottom sheet flow for every action, keyboard support on the PIN pad, `role="alert"` on errors, reduced-motion support and no horizontal scroll down to 360 px.
- **A zero-server demo.** The browser-only build answers the same API in the page and passes the same tests.
- **Good docs.** README, CONTRIBUTING, backup and recovery guide, and a roadmap.

---

## 6. Verification results

| Suite | Baseline (`19a3aaf`) | After the fixes |
|---|---|---|
| Backend tests (`npm test`) | 13 / 13 API tests | **26 / 26** (18 API + 8 engine) |
| API tests against the in-browser demo API | 13 / 13 | **18 / 18** |
| Frontend production build | Passes (Vite 5) | **Passes** (Vite 8): 298 kB JS / 97 kB gzipped, 33 kB CSS |
| Standalone demo build (`npm run build:demo`) | **Fails on Windows** (D7) | **Passes**: one 352 kB HTML file |
| `npm audit` backend / frontend | 0 / 2 | **0 / 0** |
| Live API probes (§2) | 7 defects | Probes 1, 2, 5, 6 and 8 now refused or fixed; 3 and 4 remain by design (S1, S2) |
| Dev server during writes | Restarted on every payment | No restarts (3 payments in a row, all 201/200) |
| Contrast (all text tokens, both themes) | `--text-3` 3.06:1 | Lowest is 4.60:1 (light-theme orange on the darkest panel); most are above 7:1 |
| Browser walkthrough (phone width, in-app browser) | — | Home (Safe and At-risk states), Insights charts, first-time payee + risky payment + PIN + receipt, Pay EMI with wrong then right PIN, My QR, EMIs, Profile, Light theme, Extra-large text, Back button between tabs. Only console errors were proxy 500s while the backend was restarting during edits, and the intended 400 for a wrong PIN |

---

## 7. Fix plan and status

| Status | Findings |
|---|---|
| **Fixed** | S3, S4, S6, S7, S9, S10, S12, S13, B2, B3, E1, E2, E3, E4, E7, U1, U2, U3, U4, U5, U6, U7, U8, A1, A2, A3, A4, D1, D3, D6, D7 |
| **Partly fixed** | S5 (the silent `1234` fallback is gone; PINs are still stored in plain text), S11 (the global handler and the changed endpoints hide internals; other controllers still return `error.message` on 500) |
| **Open: needed before real users** | S1, S2, S5 (hashing), S8, B1, B4, B5. Designs in [UPGRADES.md](UPGRADES.md) §4 (P0) |
| **Open: low risk** | B6, B7, B8, E5, E6, D2, D4, D5 |

One new issue was found while fixing: **D7 (Low)** `frontend/scripts/build-demo.mjs` built its working directory from `new URL(import.meta.url).pathname`, which is `/N:/…` on Windows, so `npm run build:demo` failed with `spawnSync cmd.exe ENOENT`. Fixed with `fileURLToPath`.

---

## 8. Changes made after this audit

### Security and data integrity

| # | Change | Where |
|---|---|---|
| S3 | `POST /emi/:id/pay` requires the UPI PIN, with the usual 3-try lockout. The Pay EMI sheet gained a PIN step. | `emiController.js`, `PayEmiSheet.jsx`, `browserApi.js` |
| S4 | Category changes require `userId` and check ownership (404 otherwise). | `transactionController.js`, `dataService.getTransactionById`, `store.findTransaction` |
| S5 | A user with no PIN is refused (403) instead of accepting `1234`. | `dataService.assertUpiPin` |
| S6 | New `POST /account/verify-pin`; Change PIN checks the current PIN first; a new PIN equal to the old one is refused. | `accountController.js`, `ChangePinFlow.jsx` |
| S7 | `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Content-Security-Policy` on every response. `CORS_ORIGIN` allow-list (any origin when unset). | `server.js`, `.env.example` |
| S9 | Names, lenders and payees capped at 60 characters; `frequency` must be `Monthly`; `paymentMethod` whitelisted; EMI amount and months bounded. | controllers, `browserApi.js` |
| S10 | CSV cells starting with `= + - @`, tab or CR are prefixed with `'`. | `HistoryPage.jsx` |
| S11 | The global error handler returns a generic message for 5xx. | `server.js` |
| S12 | IDs from `crypto.randomUUID()`. | `store.js`, `browserApi.js` |
| S13 | Vite 5 → 8, `@vitejs/plugin-react` 4 → 6; demo build option renamed for Rolldown. | `frontend/package.json`, `vite.config.js` |
| B2 | Atomic writes (temp file + rename). An unparsable `db.json` is moved to `db.json.corrupt-<time>` instead of being overwritten. | `store.js` |
| B3 | `nodemon.json` watches `src/` only. | `backend/nodemon.json` |

### Financial engine

| # | Change |
|---|---|
| E1 | Daily spending and the category breakdown use only the last 30 days. |
| E2 | Outlook balances keep their sign and carry `shortfall: true`; rent is last-30-days rent. The UI shows "Short ₹X" in red. |
| E3 | Due days are clamped to the month's length everywhere, including the 7-day projection. |
| E4 | New `overdue` status: the previous due date has passed, the loan existed then, and no payment covers it. Overdue EMIs are due now, sorted first, deducted tomorrow in the projection, raise SAFE to CAUTION, and lead the advice. The frontend simulator mirrors the rule. |
| E7 | No colours in the engine output. |
| D3 | `analyzeFinancialState` and `enrichEmi` accept `now`, used by 8 new date tests. |
| — | Advice and summaries rewritten in plain words ("You have enough for your ₹20,000 EMI and your everyday spending"). |

### Interface: Doomsday theme and ease of use

| # | Change |
|---|---|
| U2, A1, A2 | New design system in the style of the Doomsday Hackathon site: `#070907` background with a faint grid, `#9DFF00` accent, `#FF6A00` / `#FFD400` for risk and caution, corner-bracket frames, Russo One / Inter / JetBrains Mono. All sizes in `rem`; a **Text size** setting (100 / 112.5 / 125%); **Dark** and **Light** themes; all text tokens ≥ 4.5:1. Settings persist per device and apply before first paint. |
| U1 | Home rebuilt around "Money you can spend safely": status sentence, money-split bar, "How is this number worked out?" help, big labelled action tiles, plain labels ("EMIs to pay", "Recent payments"). First-run **getting-started tips**. **Read aloud** via the Web Speech API. |
| U3 | **First-time payee** warning; risky payments need an "I understand" tick and read "Pay ₹X anyway"; PIN pad safety note. |
| U4, A3 | New charts: 7-day area chart with a dashed "Needed for EMIs" line and HTML labels, category donut with amounts and percentages, **money calendar**, full-width outlook rows. Each chart has text or a screen-reader table. |
| U5, A4 | Sheets cannot be closed while a payment is processing, trap Tab, return focus, and keep autofocused fields focused. PIN progress is announced in a live region. |
| U6 | Bottom bar: Home, Insights, Pay, EMIs, **Profile**; History is on Home and in Profile. Each tab has a URL hash, so Back works. |
| U7 | **My QR** (`upi://pay?pa=…&pn=…&cu=INR`, `qrcode` library) in Receive and Profile. Web app manifest and icon. |
| U8 | "Can I afford it?" says when an amount is more than the balance, and has quick amounts. |
| — | Banners on Home for overdue and soon-due EMIs; EMIs page shows Overdue state and % repaid. |

### Engineering and docs

| # | Change |
|---|---|
| D1 | `.github/workflows/ci.yml`: backend tests, frontend build, demo build, and the API tests against the in-browser API. |
| D6 | All screenshots retaken, plus Insights, My QR and Light/Extra-large views. |
| D7 | `build-demo.mjs` path fix for Windows; manifest links stripped from the single-file demo. |
| — | README, UPGRADES (with this session's research) and CONTRIBUTING updated. |
