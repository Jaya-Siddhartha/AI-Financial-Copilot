# FinCopilot: Research and Roadmap

**Date:** 28 September 2026 (version 2)

FinCopilot's job: **tell people how much they can spend without missing an EMI, and stop them overspending.** This file lists the research behind version 2 and what comes next.

---

## 1. Research used in version 2

| Finding | Source | What FinCopilot does |
|---|---|---|
| Splitting money into many small category budgets can make people overspend, as they "borrow" from one category to justify another | [Think Forward Initiative](https://www.thinkforwardinitiative.com/research/budget-apps-might-they-actually-make-you-spend-more) | One headline number (safe to spend) instead of many budgets |
| Checking a budget app often can increase spending if it only shows totals | [BehavioralEconomics.com](https://www.behavioraleconomics.com/the-budgeting-app-trap-when-spending-information-backfires/) | Pace alerts compare this month with your own usual month |
| Reminders before a due date reduced loan delinquencies in a 13-million-person field experiment | [PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11789030/) | EMIs due within 3 days are flagged; autopay is one tap; late EMIs lead the screen |
| Only ~15% of people over 55 in India use fintech regularly (complexity, fear of fraud) | [Billcut / KPMG](https://www.billcut.com/blogs/fintech-cultural-design-for-older-customers-making-apps-easier/) | Plain words, big buttons, text size, read aloud, privacy explained simply |
| Lenders typically cap EMIs at about 40–50% of income (FOIR) | Industry practice | EMI burden bands and the calculator's "fits your income" check |
| PhonePe statements are password-protected PDFs (password: mobile number) | [BankingTricks](https://www.bankingtricks.net/phonepe-account-statement/) | Password field per statement with a hint |
| WebLLM can run Qwen2.5-1.5B in a browser tab with ~1.6 GB of GPU memory | [WebLLM](https://github.com/mlc-ai/web-llm) | Offline AI with Smart and Lite models |
| Credit bureau access requires a registered business and KYC through a licensed partner | Bureau and partner terms | Clearly labelled estimate instead of a fake "CIBIL score" |

---

## 2. Roadmap

**P0** before sharing widely · **P1** next · **P2** later.

### P0: Launch checklist

| Item | Why |
|---|---|
| Set Supabase Site URL and redirect URLs | Confirmation and reset emails must point at the live site (README → Supabase setup) |
| Add SMTP to Supabase (e.g. Resend) | The built-in sender allows only a few emails per hour |
| CAPTCHA on sign-up (Supabase supports hCaptcha / Turnstile) | Stops bots creating accounts |
| Privacy notice and consent screen | India's DPDP Rules 2025 apply from May 2027; state purpose, retention and deletion |

### P1: Real data without manual uploads

| Item | How |
|---|---|
| **Account Aggregator (AA)** | The legal, consent-based way to fetch real bank transactions and balances in India. Integrate a licensed AA through Sahamati members (e.g. Setu, Finvu, OneMoney). Replaces uploads and "Match with bank" for supported banks. |
| **Real credit score** | Through a licensed bureau partner once there is a registered business. Keep the estimate as a fallback. |
| **Scanned statements** | On-device OCR (Tesseract.js) for photographed PDFs. |
| **Reminders** | Web Push notifications ("Car loan EMI in 3 days", "You're spending faster than usual"), via a small Supabase Edge Function. |
| **Hindi and regional languages** | Move strings to translation files; read aloud in `hi-IN`. |

### P2: Smarter advice

| Item | Why |
|---|---|
| Salary-aware forecast | If salary arrives before the EMI, the EMI is safer; show the lowest point before payday |
| Goals ("save ₹20,000 for Diwali") | Positive framing beats only warnings |
| Learning categories from corrections | Remember "RAMESH KIRANA → Groceries" after one change |
| Weekly summary, read aloud | A gentle habit for less app-savvy users |
| Shared household view | Let a family member see alerts for an older parent, with consent |
| Larger on-device model option | Qwen 2.5 3B for laptops with more GPU memory |

---

## 3. What is intentionally not included

- **Bill payments and money transfers.** Moving money needs an RBI/NPCI-licensed partner and is outside this app's purpose. FinCopilot helps you decide; your bank or UPI app pays.
- **Cloud AI (API keys).** By design, the AI runs on your device, so your money data never goes to an AI company.
