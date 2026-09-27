# FinCopilot: Recommended Upgrades

**Date:** 27 September 2026
**Based on:** the audit in [AUDIT_REPORT.md](AUDIT_REPORT.md), plus a review of how leading Indian payment and money apps work today (sources at the end).

FinCopilot's edge is one question no mainstream UPI app answers at the moment you pay: **"If I pay this, can I still cover my EMIs?"** Every upgrade below either makes that answer more trustworthy, or brings the everyday payment experience up to what users already get from PhonePe, Google Pay and Paytm.

---

## 1. How FinCopilot compares

| Capability | PhonePe | Google Pay | Paytm | CRED / Jupiter | FinCopilot today |
|---|---|---|---|---|---|
| Pay to mobile number / UPI ID with PIN | Yes | Yes | Yes | Yes | **Yes** (simulated) |
| Check bank balance with PIN | Yes | Yes | Yes | Yes | **Yes** |
| Wrong-PIN lockout | 3 attempts, 24 h (bank rule) | 3 attempts, 24 h | Same | Same | **Yes**, 3 attempts / 5 min (demo) |
| Scan & pay QR | Yes | Yes | Yes | Yes | No |
| UPI Lite (PIN-free small payments) | Yes (up to ₹1,000) | Yes (load up to ₹5,000) | Yes | Some | No |
| UPI Autopay mandates (EMIs, bills, SIPs) | Yes, with pre-debit alerts | Yes | Yes | Reminders | EMIs tracked and paid manually |
| Tap & Pay (NFC) | — | Yes | — | — | No |
| Biometric approval instead of PIN | Yes (up to ₹10,000 from Aug 2026) | Yes | Yes | — | No |
| Credit line on UPI | Yes | Yes | Yes | — | No |
| Bill and recharge reminders | Yes | Yes | Yes | Yes (CRED Money) | No |
| Spend summary by category | Basic | Limited | Yes (monthly, auto-categorised) | Yes (Jupiter Money, CRED Money) | **Yes** |
| All bank balances in one place | — | — | Yes (UPI-linked) | Yes (Account Aggregator) | One simulated account |
| Statement download | Yes | — | Yes (PDF/Excel) | Yes | **Yes** (CSV) |
| Hide payments | — | — | Yes | — | No |
| **Safe-to-spend before EMIs** | No | No | No | Partly (budgets) | **Yes: the core feature** |
| **Warning on the pay screen if an EMI is at risk** | No | No | No | No | **Yes** |

**Takeaway:** FinCopilot matches the basics and is ahead on EMI-aware spending. The gaps that matter most to users are QR scan-and-pay, Autopay-style EMI handling, bill reminders, and real multi-account data.

---

## 2. Priority roadmap

Priorities: **P0** before any real users · **P1** next release · **P2** differentiators · **P3** later.

### P0: Security and trust (required before real money or real users)

| Upgrade | Why | How |
|---|---|---|
| **User accounts and sessions** | Today any client can act as any `userId` (audit B6). | Mobile number + OTP login; short-lived JWT access token and refresh token in an `httpOnly` cookie. Derive `userId` on the server from the session and never trust it from the request body. |
| **Never handle the real UPI PIN** | Real UPI apps never see the PIN. It is captured by NPCI's common library and verified by the issuing bank. | For real payments, integrate through a licensed PSP bank / payment aggregator SDK. Keep the in-app PIN pad only for demo mode. |
| **Hash any app-level secrets** | Demo PINs are stored in plain text (audit §3.4). | If an app passcode is added, store it with `bcrypt`/`argon2`. |
| **Rate limiting and CORS allow-list** | Only the PIN has a lockout today. | `express-rate-limit` per IP and per user; restrict `cors()` to the app's own domain. |
| **Persistent database in production** | On Vercel without MongoDB, data sits in per-instance `/tmp`. Different requests can see different balances. | Set `MONGODB_URI` (Atlas). Use MongoDB transactions for transfers so the debit, credit and ledger entries commit together. |
| **Idempotent payments** | A double tap or retry on a slow network could pay twice. | Client sends an `Idempotency-Key` per payment; the server stores it and returns the first result for repeats. |
| **DPDP Act compliance** | The DPDP Rules 2025 are notified; core obligations apply from 13 May 2027, with penalties up to ₹250 crore. | Standalone consent notice at signup, purpose limitation, data export/delete, breach process, and retention limits for transaction data. |
| **Security headers** | Not set today. | `helmet` (CSP, HSTS, frame-ancestors). |

### P1: Everyday payment parity

| Upgrade | Seen in | Notes |
|---|---|---|
| **Scan & pay QR / My QR** | All UPI apps | Show the user's UPI QR (`upi://pay?pa=…&pn=…`) in Receive; add a camera scanner (`BarcodeDetector` API with a JS fallback). |
| **EMI Autopay with pre-debit alerts** | PhonePe, Google Pay, Paytm (UPI Autopay) | Model EMIs as mandates: a notification 24 h before debit, automatic debit on the due day, pause/cancel. This fits the "protect my EMI" story directly. |
| **Bill and recharge reminders** | Google Pay, CRED Money, Jupiter | Detect recurring payees (broadband, rent, recharge) from the ledger and remind before the due date. Include them in "EMIs due" as fixed obligations. |
| **Notifications** | All | Web Push / PWA notifications for "EMI due in 3 days", "Payment received", and "You're now at risk". |
| **Installable PWA and offline shell** | — | Manifest + service worker so the app installs to the home screen and opens instantly. |
| **Dark mode** | PhonePe, Google Pay, Paytm | The new design uses CSS variables, so a `prefers-color-scheme` theme is a small change. |
| **Hindi and regional languages** | PhonePe, Paytm | Extract strings to an i18n file; start with Hindi. |
| **Payment request / split** | Google Pay, PhonePe | "Request money" to a contact, and splitting a bill between contacts. |
| **Hide payment** | Paytm | Hide a transaction from history (it still counts in totals). |
| **PDF statements with a date range** | Paytm | Extend the CSV export with a date range and PDF output. |

### P2: Strengthen the differentiator (safe-to-spend)

| Upgrade | Why | How |
|---|---|---|
| **Better daily spending estimate** | Today: debits of the last 100 transactions ÷ 30, with a ₹300/day floor. It ignores dates and one-off spikes. | Use a rolling 30- or 60-day window by date, a median or trimmed mean to ignore one-offs, and separate weekday and weekend rates. |
| **Salary-aware horizon** | If salary arrives before an EMI, the EMI is less at risk. | Model money in (salary date) and out (EMIs, rent, bills) on one timeline and compute the lowest projected balance before the next salary. |
| **Detect recurring obligations** | Rent is only counted if labelled "Housing & Rent". | Detect repeated payees and amounts (rent, SIPs, subscriptions) and treat them as fixed. |
| **Adjustable safety buffer** | The ₹2,000 buffer is hard-coded. | Let users set it, or default it to about 10% of monthly income. |
| **Nudges at the right moment** | Warnings exist on the pay screen. | Add a soft confirm ("This leaves ₹1,200 before your EMI on the 12th. Pay anyway?") for HIGH RISK payments, and a weekly summary. |
| **Account Aggregator (AA) data** | Real balances and transactions across all banks, with consent. 252.9 million users had linked accounts by Dec 2025. | Integrate via an RBI-licensed AA (Sahamati ecosystem) to replace the manual "verified balance" with real data. |
| **Credit line and EMI-on-UPI awareness** | Credit line on UPI is live in PhonePe and others. | Show available credit separately and never count it as "safe to spend". |
| **Explain every number** | Trust. | Every figure on Insights links to the transactions behind it (partly done in the calculation card). |

### P3: Platform and engineering

| Upgrade | Why |
|---|---|
| **Upgrade Vite to a current major** | Clears the open `esbuild` dev-server advisory (audit R8). |
| **TypeScript** on shared API types | The frontend/backend contract is currently implicit. |
| **Frontend tests** | Vitest for `lib/`, plus the Playwright walkthrough from the audit as a CI job. |
| **CI** (GitHub Actions) | Run `npm test`, `npm run build` and `npm audit` on every PR. |
| **Remove `api/index.js` and root runtime deps** | Likely redundant with the `services` config in `vercel.json`. Confirm on the Vercel dashboard first. |
| **Structured logging and error tracking** | e.g. pino + Sentry. `console.error` today. |
| **Self-host the font** | Removes the Google Fonts dependency and the external request. |
| **Seed data that reconciles** | Make starting balance + transactions = current balance (audit §3.4). |

---

## 3. Newer UPI features to watch (2025–2026)

- **Biometric authentication.** On-device fingerprint/face approval, introduced October 2025. The limit rose from ₹5,000 to ₹10,000 per transaction from 7 August 2026.
- **UPI Tap & Pay.** NFC payments at POS terminals using the terminal's internet connection.
- **MyUPI (UPI Help 2.0).** NPCI's assistant with a consolidated view of transactions and AutoPay mandates, plus a "Safety Switch" to block UPI debits if an account is compromised. A similar "freeze payments" switch would suit FinCopilot's protective positioning.
- **UPI Circle.** Delegate full or partial payment access to trusted people (for example, parents paying for students). Pairs well with safe-to-spend limits.
- **Limits.** P2P UPI is capped at ₹1,00,000 per day for most users (higher for certain categories). FinCopilot now enforces the ₹1 lakh per-payment cap.

---

## 4. Suggested order

1. **P0 security items.** Required before anything else goes to real users.
2. **QR scan/receive, Autopay-style EMIs, notifications.** Biggest parity gaps.
3. **Better burn-rate model + salary-aware horizon.** Makes the core number more accurate.
4. **Account Aggregator integration.** Real data turns the demo into a product.

---

## Sources

- [ThePrint: 6 best UPI apps in India for 2026 (autopay, UPI Lite, credit line)](https://theprint.in/brandit/6-best-upi-apps-in-india-for-2026-features-autopay-upi-lite-and-credit-line-support/3049830/)
- [PhonePe: Credit Line on UPI](https://www.phonepe.com/press/phonepe-enables-credit-line-on-upi-on-its-platform/)
- [PhonePe Payments](https://www.phonepe.com/payments/)
- [NPCI: New UPI capabilities at GFF 2026 (Tap & Pay, MyUPI)](https://www.npci.org.in/uploads/NPCI_Press_Release_RBI_Governor_Unveils_New_UPI_Capabilities_at_GFF_2026_AI_Powered_Customer_Support_and_Seamless_Tap_and_Pay_Experience_bb763a7670.pdf)
- [NPCI: Additional authentication methods in UPI](https://www.npci.org.in/uploads/UPI_OC_No_226_FY_2025_26_Introduction_of_Additional_Authentication_methods_in_UPI_42c3693399.pdf)
- [NPCI: UPI Circle](https://www.npci.org.in/product/upi-circle)
- [News4Bharat: UPI rules 2026, limits and biometric changes](https://news4bharat.com/bfsi/upi-rules-2026-rbi-npci-limits-and-biometric-changes)
- [Google Pay Help: UPI Lite](https://support.google.com/pay/india/answer/13327133?hl=en)
- [Google Pay Help: Tap & Pay on UPI](https://support.google.com/pay/india/answer/14980962?hl=en)
- [Paytm: all-new app, 10 features](https://paytm.com/blog/artificial-intelligence/paytm-all-new-app-experience-is-live-here-are-10-features-you-shouldnt-miss/)
- [Paytm: download UPI statement](https://paytm.com/blog/payments/upi/how-to-download-upi-statement-from-paytm/)
- [Business Standard: CRED Money launch](https://www.business-standard.com/amp/finance/news/cred-launches-product-to-track-expenses-view-total-bank-account-balances-124072400997_1.html)
- [Jupiter Money Manager](https://jupiter.money/money/)
- [INDmoney features](https://www.indmoney.com/features)
- [Razorpay: UPI transaction limit per day (2026)](https://razorpay.com/blog/upi-transaction-limit-per-day/)
- [Paytm: UPI PIN blocked after multiple attempts](https://paytm.com/blog/payments/upi/forgot-upi-pin-multiple-times-unblock/)
- [Sahamati: Account Aggregator ecosystem](https://sahamati.org.in/)
- [HyperVerge: Account Aggregator framework (2026 guide)](https://hyperverge.co/blog/account-aggregator-framework-rbi/)
- [PIB: DPDP Rules, 2025 notified](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2190014&reg=3&lang=2)
- [EY: DPDP Act 2023 and Rules 2025 compliance](https://www.ey.com/en_in/insights/cybersecurity/decoding-the-digital-personal-data-protection-act-2023)
