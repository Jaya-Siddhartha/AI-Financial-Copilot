# FinCopilot: Upgrades, Research and Roadmap

**Date:** 28 September 2026
**Based on:** the audit in [AUDIT_REPORT.md](AUDIT_REPORT.md), web research on what UPI and money apps offer in 2026, guidance on designing finance apps for older and first-time users, and the Doomsday Hackathon site as the visual reference (sources at the end).

FinCopilot's edge is one question no mainstream UPI app answers at the moment you pay: **"If I pay this, can I still cover my EMIs?"** Every upgrade either makes that answer more trustworthy, makes it easier to understand for anyone from 20 to 70, or brings the everyday payment experience up to what users already get from PhonePe, Google Pay and Paytm.

---

## 1. What the research found

### 1.1 UPI in 2026

- **Tap & Pay and MyUPI.** At the Global Fintech Fest (September 2026) the RBI Governor launched UPI Tap & Pay (NFC at POS terminals, using the terminal's internet) and **MyUPI**, an AI assistant built on NPCI's FiMI model that gives one view of transactions and AutoPay mandates across apps. MyUPI adds a **Safety Switch** to block UPI debits if an account is compromised, and **UPI Number Delink**.
- **Biometric approval** (face or fingerprint instead of the PIN) passed 6.29 billion transactions by 31 August 2026.
- **Collect requests for person-to-person payments are gone.** NPCI removed P2P collect requests because scammers used fake "refund" or "buyer" requests to trick people into paying. Only large, vetted merchants can still send them.
- **Fraud warnings before you pay.** NPCI's AI system flags high-risk payees and shows a warning in the payer's app before confirmation, with **voice alerts** being added for elderly and visually impaired users.

### 1.2 Designing for older and first-time users

- Only **15% of people over 55 in India** use fintech apps regularly (KPMG India, 2025). The reasons they give are complexity, **fear of fraud**, and no human guidance. Yet people over 65 were the fastest-growing fintech group in 2025 (+22%).
- What helps: large buttons and bold text, adjustable text size, high contrast, consistent colour cues, plain language instead of jargon, guided first steps, microcopy that explains security in plain words, and optional audio.
- Standards: **WCAG 2.2 AA** is the technical baseline; the **European Accessibility Act** has applied to banking apps since 28 June 2025.

### 1.3 Money-app UX in 2026

- **Calendar views** put money in and out on dates, which makes tight days visible in advance.
- **"Safe to spend" with a floor** and alerts before the balance drops below it (for example Centinel's two-month forecast).
- Trust comes from **explaining every number**, plain-language alerts, useful empty states, and privacy cues.

### 1.4 The visual reference

The Doomsday Hackathon site uses a near-black background (`#070907`) with a faint grid, a toxic-lime accent (`#9DFF00`), hazard orange (`#FF6A00`) and warning yellow (`#FFD400`), Russo One for display type, Inter for text, JetBrains Mono for uppercase labels ("05 — CHOOSE YOUR TRACK"), sharp corners and lime corner-bracket frames around key content. These colours happen to be very high contrast on black (lime is 15.9:1, yellow 14:1, orange 7:1), which suits a readable finance app.

---

## 2. What was built from it (this update)

| Finding | What FinCopilot now does |
|---|---|
| Older users struggle with complexity | Home is built around **one big number** ("Money you can spend safely") with a one-sentence status in plain words and **big labelled buttons** ("Send money", "Pay an EMI", "Receive / My QR"). |
| Adjustable text size, high contrast | **Text size** setting (Normal / Large / Extra large) that scales the whole app; **Dark** (Doomsday) and **Light** themes; every text colour ≥ 4.5:1, most ≥ 7:1; 44 px tap targets. |
| Guided first steps | **Getting-started tips** on first launch (three steps), hideable and re-openable from Profile. |
| Explain every number | A **money-split bar** (EMIs / everyday spending / cushion / safe) on Home and Insights, "How is this number worked out?" help panels, and the line-by-line sum. |
| Voice alerts for elderly users | **Read aloud** button (device speech, Indian English, "₹" read as "rupees"). |
| Fraud warnings before paying | **"First time paying…"** warning for payees not in your contacts, and a **PIN safety note** ("You never need your PIN to receive money", which is exactly the collect-request scam). |
| Warn before risky payments | A payment that could leave you short for an EMI now needs an explicit **"I understand"** tick; the button says "Pay anyway". |
| Calendar view of money in/out | **Coming up**: salary and EMIs on dates, with late EMIs marked. |
| Low-balance days in advance | **7-day area chart** with a dashed "Needed for EMIs" line; days below it turn orange. |
| Missed payments matter | **Overdue EMIs**: flagged on Home with a "Pay now" banner, raise the status to at least "Be careful". |
| QR is how India pays | **My QR** (standard `upi://pay` link) in Receive and Profile. |
| Install to home screen | **Web app manifest** and icon. |
| Every UPI debit needs approval | **EMI payments now need the UPI PIN** (audit S3). |

---

## 3. How FinCopilot compares now

| Capability | PhonePe | Google Pay | Paytm | CRED / Jupiter | FinCopilot |
|---|---|---|---|---|---|
| Pay to mobile number / UPI ID with PIN | Yes | Yes | Yes | Yes | **Yes** (demo) |
| Check bank balance with PIN | Yes | Yes | Yes | Yes | **Yes** |
| Wrong-PIN lockout | 3 tries (bank rule) | 3 tries | Same | Same | **Yes**, 3 tries / 5 min |
| My QR to receive | Yes | Yes | Yes | Yes | **Yes** |
| Scan & pay QR | Yes | Yes | Yes | Yes | No |
| Tap & Pay (NFC) | Rolling out | Yes | Rolling out | — | No (needs a real PSP) |
| Biometric approval | Yes | Yes | Yes | — | No |
| UPI Autopay mandates for EMIs | Yes | Yes | Yes | Reminders | EMIs tracked, overdue flagged, paid manually |
| Warning for new / suspicious payees | NPCI alerts | NPCI alerts | NPCI alerts | — | **Yes** (not in contacts) |
| Spend summary by category | Basic | Limited | Yes | Yes | **Yes** (donut, 30 days) |
| Cash-flow calendar | — | — | — | Partly | **Yes** |
| Text size / light & dark themes in-app | System | System | System | System | **Yes, in-app** |
| Read aloud | — | — | — | — | **Yes** |
| **Safe-to-spend before EMIs** | No | No | No | Partly (budgets) | **Yes: the core feature** |
| **Confirmation when a payment puts an EMI at risk** | No | No | No | No | **Yes** |

---

## 4. Roadmap

Priorities: **P0** before any real users · **P1** next release · **P2** strengthen the differentiator · **P3** platform.

### P0: Security and trust (required before real money or real users)

| Upgrade | Why | How |
|---|---|---|
| **User accounts and sessions** | Any client can act as any `userId` (audit S1). | Mobile number + OTP login; short-lived JWT and refresh token in an `httpOnly` cookie. Derive `userId` on the server only. |
| **Never handle the real UPI PIN** | Real UPI apps never see the PIN; NPCI's common library captures it and the bank verifies it. | Integrate through a licensed PSP bank / payment aggregator SDK. Keep the in-app PIN pad for demo mode only. |
| **Lock down the demo-only endpoints** | `receive` credits any amount; `reset` wipes everything (audit S2, S8). | Put them behind a `DEMO_MODE` flag and authentication. |
| **Hash app-level secrets** | Demo PINs are plain text (S5). | `scrypt` / `bcrypt` for any app passcode. |
| **Rate limiting** | Only the PIN has a lockout (S8). | `express-rate-limit` per IP and per user. |
| **Atomic transfers** | A transfer is four separate writes (B1). | MongoDB session transactions (Atlas supports them); one save for the JSON store. |
| **Idempotent payments** | A retry could pay twice (B4). | `Idempotency-Key` header stored with the first result. |
| **Match payees only by phone / UPI ID** | Name matching could pay the wrong person (B5). | Drop the name match once real accounts exist. |
| **DPDP Act compliance** | DPDP Rules 2025 are notified; core duties apply from 13 May 2027. | Consent notice, purpose limitation, export/delete, breach process, retention limits. |

### P1: Everyday payment parity

| Upgrade | Seen in | Notes |
|---|---|---|
| **Scan & pay** | All UPI apps | Camera scanner with the `BarcodeDetector` API and a JS fallback; parse `upi://pay` links. |
| **EMI Autopay with pre-debit alerts** | PhonePe, Google Pay, Paytm | Model EMIs as mandates: notice 24 h before, automatic debit on the due day, pause/cancel. |
| **Safety Switch** | MyUPI | One tap to block all outgoing payments on this app until unlocked with the PIN. Fits the "protect me" story. |
| **Notifications** | All | Web Push via a service worker: "EMI due in 3 days", "EMI overdue", "Payment received". |
| **Offline shell** | — | Service worker caching the app shell (the manifest is already in place). |
| **Hindi and regional languages** | PhonePe, Paytm | Move strings to an i18n file; start with Hindi. Read aloud can then use `hi-IN`. |
| **Trusted helper (UPI Circle-style)** | NPCI UPI Circle | Let a family member see alerts or approve large payments for an older user. |
| **Bill and recharge reminders** | Google Pay, CRED | Detect recurring payees and treat them as fixed obligations. |
| **PDF statements with a date range** | Paytm | Extend the CSV export. |

### P2: Strengthen safe-to-spend

| Upgrade | Why | How |
|---|---|---|
| **Salary-aware horizon** | If salary arrives before an EMI, the EMI is less at risk (audit E5). | One timeline of money in and out; find the lowest projected balance before the next salary. |
| **Smarter daily spending** | Now: last 30 days ÷ 30 with a ₹300 floor. One-off purchases inflate it. | Median or trimmed mean; separate weekday and weekend rates. |
| **Adjustable safety cushion** | ₹2,000 for every income level (E6). | User setting, defaulting to about 5% of monthly income. |
| **Account Aggregator data** | Real balances across banks, with consent. | Integrate an RBI-licensed AA (Sahamati ecosystem). |
| **Weekly summary** | Habit and trust. | "This week you spent ₹X; your EMIs are covered." Read aloud too. |

### P3: Platform and engineering

| Upgrade | Why |
|---|---|
| **Frontend tests** | Vitest for `lib/` (affordability, format) and a Playwright smoke test of the pay flow in CI. |
| **TypeScript for the API contract** | The frontend/backend contract is implicit. |
| **Share handlers with the browser demo** | `browserApi.js` duplicates the controllers (B8). |
| **Self-host fonts** | Removes the Google Fonts request (privacy, offline). |
| **Structured logging and error tracking** | pino + Sentry instead of `console.error`. |
| **Remove `api/index.js`** | Not used by the current `vercel.json` (B7). Confirm on the Vercel dashboard first. |
| **React 19, Express 5, Mongoose 9** | One major at a time, now that CI exists. |

### Done in this update

Vite 8 (clears the dev-server advisory), GitHub Actions CI, dark mode (plus light), My QR, web app manifest, overdue EMIs, 30-day spending window, signed outlook, text size, read aloud, scam and risk confirmations.

---

## 5. Suggested order

1. **P0 security.** Required before anything goes to real users.
2. **Scan & pay, Autopay-style EMIs, notifications, Safety Switch.** The biggest parity and trust gaps.
3. **Hindi + trusted helper.** Widens who can use it, which is the point of the redesign.
4. **Salary-aware horizon and Account Aggregator.** Real data turns the demo into a product.

---

## Sources

**UPI and payments, 2026**
- [NPCI: New UPI capabilities at GFF 2026 (Tap & Pay, MyUPI)](https://www.npci.org.in/uploads/NPCI_Press_Release_RBI_Governor_Unveils_New_UPI_Capabilities_at_GFF_2026_AI_Powered_Customer_Support_and_Seamless_Tap_and_Pay_Experience_bb763a7670.pdf)
- [Business Standard: UPI gets Tap-to-pay and a unified window for transaction details](https://www.business-standard.com/finance/news/upi-gets-new-features-tap-to-pay-unified-window-for-transaction-details-126091001485_1.html)
- [LatestLY: Understanding Tap & Pay and AI-powered MyUPI](https://www.latestly.com/technology/new-upi-capabilities-unveiled-in-mumbai-understanding-tap-pay-and-ai-powered-myupi-7601027.html)
- [IndianWeb2: RBI Governor unveils new UPI capabilities](https://www.indianweb2.com/2026/09/rbi-governor-unveils-new-upi.html)
- [NewsBytes: NPCI pulls the plug on UPI collect requests](https://www.newsbytesapp.com/news/business/npci-pulls-the-plug-on-upi-collect-requests-to-fight-fraud/tldr)
- [Billcut: New NPCI alerts reduce UPI scams](https://www.billcut.com/blogs/new-npci-alerts-fewer-upi-payment-scams/)
- [VARINDIA: NPCI tightens UPI collect and Autopay rules](https://www.varindia.com/news/npci-tightens-upi-collect-and-autopay-rules-amid-rising-fraud-risks)
- [NPCI: Fraud awareness](https://www.npci.org.in/fraud-awareness)
- [NPCI: Additional authentication methods in UPI](https://www.npci.org.in/uploads/UPI_OC_No_226_FY_2025_26_Introduction_of_Additional_Authentication_methods_in_UPI_42c3693399.pdf)
- [NPCI: UPI Circle](https://www.npci.org.in/product/upi-circle)
- [ThePrint: Best UPI apps in India for 2026](https://theprint.in/brandit/6-best-upi-apps-in-india-for-2026-features-autopay-upi-lite-and-credit-line-support/3049830/)
- [Razorpay: UPI transaction limit per day (2026)](https://razorpay.com/blog/upi-transaction-limit-per-day/)

**Accessibility and older users**
- [Billcut: Fintech design for older customers](https://www.billcut.com/blogs/fintech-cultural-design-for-older-customers-making-apps-easier/)
- [nasscom: Accessibility in fintech](https://community.nasscom.in/communities/it-services/accessibility-fintech-designing-all-users)
- [Netguru: Fintech app accessibility](https://www.netguru.com/blog/fintech-app-accessibility)
- [accessiBe: Accessible fintech charts and data](https://accessibe.com/blog/knowledgebase/making-fintech-accessible)
- [DeviQA: Accessibility testing for financial applications](https://www.deviqa.com/blog/accessibility-testing-for-financial-applications-the-qa-framework-that-covers-standards-risks-and-real-flows/)
- [Adchitects: Interface design for older adults](https://adchitects.co/blog/guide-to-interface-design-for-older-adults)

**Money-app UX**
- [G&CO: UX practices for finance apps in 2026](https://www.g-co.agency/insights/the-best-ux-design-practices-for-finance-apps)
- [Appthetics: Budgeting app UX patterns](https://www.appthetics.com/blog/budgeting-apps-ux-patterns)
- [CalendarBudget: Budget apps in 2026](https://calendarbudget.com/the-ultimate-guide-to-the-best-budget-app-of-2026/)
- [Centinel: Personal cash-flow forecast apps](https://www.centinelmoney.com/resources/best-personal-cash-flow-forecast-apps)
- [Wavespace: Banking apps with exceptional UX (2026)](https://www.wavespace.agency/blog/banking-app-ux)

**Earlier research (still relevant)**
- [PhonePe: Credit Line on UPI](https://www.phonepe.com/press/phonepe-enables-credit-line-on-upi-on-its-platform/)
- [Google Pay Help: Tap & Pay on UPI](https://support.google.com/pay/india/answer/14980962?hl=en)
- [Paytm: all-new app, 10 features](https://paytm.com/blog/artificial-intelligence/paytm-all-new-app-experience-is-live-here-are-10-features-you-shouldnt-miss/)
- [Business Standard: CRED Money launch](https://www.business-standard.com/amp/finance/news/cred-launches-product-to-track-expenses-view-total-bank-account-balances-124072400997_1.html)
- [Sahamati: Account Aggregator ecosystem](https://sahamati.org.in/)
- [PIB: DPDP Rules, 2025 notified](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2190014&reg=3&lang=2)

**Visual reference**
- [Doomsday Hackathon (ACM SIGCHI SRM)](https://doomsday-acm.vercel.app/)
