# FinCopilot: Research and Roadmap

**Date:** 29 September 2026 (version 2.2)

FinCopilot's job: **tell people how much they can spend without missing an EMI, and stop them overspending.** This file lists how it compares with the big payment apps, the research behind it, and what comes next.

---

## 1. Where FinCopilot stands next to PhonePe, Paytm and Google Pay

Those apps are built to **move money**. FinCopilot is built to **stop you spending money you need for your EMIs**. It does not compete on payments; it sits next to them.

| | PhonePe / Paytm / Google Pay | FinCopilot |
|---|---|---|
| Main job | Pay, recharge, invest, borrow | Decide how much you can safely spend |
| Sees all your apps at once | No, only its own payments | **Yes**: upload PhonePe, Google Pay, Paytm and bank statements together; duplicates removed |
| Protects EMIs first | No | **Yes**: safe to spend keeps EMIs, usual spending and your buffer aside; per-day amount until salary |
| "Can I afford it?" before buying | No | **Yes**, exact, same maths as Home |
| Credit score | Free score through a paid bureau partnership, needs PAN | Your own free report PDF read on your device, or type it in; no PAN asked |
| Account and KYC | Required | **None**: opens straight away, data stays on your phone |
| AI | Cloud, if any | **On your device**, no API key; money answers always exact |
| Nudges to spend or borrow | Offers, cashback, loans | **None**: no ads, no offers, no lending |
| Works offline | Partly | **Yes**, after the first visit |

---

## 2. Done in version 2.2

| Item | Notes |
|---|---|
| Real credit score | Type it in or read the free credit report PDF (CIBIL, Experian, Equifax, CRIF), history and change, links to the free reports |
| Per-day allowance | "About ₹X a day until salary" on Home and in the assistant |
| Savings goals | Monthly amount needed, progress, and whether it fits your usual monthly surplus |
| Prepayment calculator | Interest and months saved by paying extra once |
| Sample data | One tap to try the app with a made-up person |
| Offline app | Service worker; the app opens with no internet |
| Test robot | 114 end-to-end checks in headless Chrome, on every push |

---

## 3. Research used

| Finding | Source | What FinCopilot does |
|---|---|---|
| Splitting money into many small category budgets can make people overspend, as they "borrow" from one category to justify another | [Think Forward Initiative](https://www.thinkforwardinitiative.com/research/budget-apps-might-they-actually-make-you-spend-more) | One headline number (safe to spend), and one per-day amount |
| Checking a budget app often can increase spending if it only shows totals | [BehavioralEconomics.com](https://www.behavioraleconomics.com/the-budgeting-app-trap-when-spending-information-backfires/) | Pace alerts compare this month with your own usual month |
| Reminders before a due date reduced loan delinquencies in a 13-million-person field experiment | [PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11789030/) | EMIs due within 3 days are flagged; autopay is one tap; late EMIs lead the screen |
| Only ~15% of people over 55 in India use fintech regularly (complexity, fear of fraud) | [Billcut / KPMG](https://www.billcut.com/blogs/fintech-cultural-design-for-older-customers-making-apps-easier/) | Plain words, big buttons, text size, read aloud, privacy explained simply |
| Lenders typically cap EMIs at about 40–50% of income (FOIR) | Industry practice | EMI burden bands and the calculator's "fits your income" check |
| Every credit bureau must give each person one free full credit report a year | RBI circular on free annual credit reports (2016) | Links to all four bureaus and a reader for the report PDF |
| Bureau data access requires a registered, KYC-checked member or licensed partner | Credit Information Companies (Regulation) Act 2005 and bureau terms | No automatic fetching; the user brings their own report |
| PhonePe statements are password-protected PDFs (password: mobile number) | [BankingTricks](https://www.bankingtricks.net/phonepe-account-statement/) | Password field per statement with a hint |
| WebLLM can run Qwen2.5-1.5B in a browser tab with ~1.6 GB of GPU memory | [WebLLM](https://github.com/mlc-ai/web-llm) | Offline AI with Smart and Lite models |

---

## 4. Roadmap

**P1** next · **P2** later.

### P1: Real data without manual uploads

| Item | How |
|---|---|
| **Account Aggregator (AA)** | The legal, consent-based way to fetch real bank transactions and balances in India. Integrate a licensed AA through Sahamati members (e.g. Setu, Finvu, OneMoney). Replaces uploads and "Match with bank" for supported banks. Needs a registered business (FIU licence). |
| **Automatic credit score** | Through a licensed bureau partner once there is a registered business, with the user's consent. The report reader and manual entry stay as the free option. |
| **Reminders** | Web Push notifications ("Car loan EMI in 3 days", "You're spending faster than usual"). Needs a small push server. |
| **Scanned statements** | On-device OCR (Tesseract.js) for photographed PDFs and credit reports. |
| **Hindi and regional languages** | Move strings to translation files; read aloud in `hi-IN`. |
| **Privacy notice** | India's DPDP Rules apply from May 2027. Data already stays on the device; add a short notice on first open. |

### P2: Smarter advice

| Item | Why |
|---|---|
| Salary-aware forecast | If salary arrives before the EMI, the EMI is safer; show the lowest point before payday |
| Learning categories from corrections | Remember "RAMESH KIRANA → Groceries" after one change |
| Goal contributions from transactions | Mark a transfer as "saved for Diwali" and move the progress bar automatically |
| Weekly summary, read aloud | A gentle habit for less app-savvy users |
| Shared household view | Let a family member see alerts for an older parent, with consent (needs optional cloud sync; the Supabase schema is kept for this) |
| Larger on-device model option | Qwen 2.5 3B for laptops with more GPU memory |

---

## 5. What is intentionally not included

- **Bill payments and money transfers.** Moving money needs an RBI/NPCI-licensed partner and is outside this app's purpose. FinCopilot helps you decide; your bank or UPI app pays.
- **Cloud AI (API keys).** By design, the AI runs on your device, so your money data never goes to an AI company.
- **Asking for your PAN.** Not needed for anything FinCopilot does, and a privacy risk.
