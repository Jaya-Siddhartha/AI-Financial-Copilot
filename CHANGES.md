# What changed in FinCopilot

## 2.2.1: Safer "safe to spend", offline AI re-tested, better credit report reading (29 September 2026)

- **Fixed: spending less than "safe to spend" could still show "At risk".** A purchase lowered the balance *and* raised the forecast of usual daily spending, so the same money was counted twice (for example: safe to spend ₹55,780, spend ₹32,903, told "₹8,026 short for your EMI"). Usual spending now comes from complete past days only, so spending ₹X lowers safe to spend by exactly ₹X.
- **Fixed: "Can I afford it?" said "Yes" to amounts above safe to spend** when no EMI was waiting (it only checked EMIs). It now says no when the amount is more than your balance, and "not a good idea" when it is more than safe to spend, both in the assistant and in Insights.
- **Assistant, found by re-testing the offline AI with real questions:**
  - "Should I buy a phone for 40000 on EMI?" now gets the loan answer (monthly EMI, interest, share of income), not the purchase check.
  - "Explain why my credit score matters" goes to the AI (or a built-in explanation) instead of the score lookup.
  - "Tips to reach a savings goal" goes to the AI instead of the goal numbers.
  - "How much can I spend?" no longer says "keeps ₹0 for EMIs, about ₹0 for everyday needs".
- **Credit report reading:** now also reads "764/900", zero-padded scores such as "00787" in CIBIL's score table, and "-1" (no credit history). If a report still cannot be read, a **Type it in instead** button appears.
- Tests: 47 unit tests; simulation 777,428 checks (47 rules, 0 failures), including "spending ₹X lowers safe to spend by exactly ₹X" and "Can I afford never says yes above safe to spend"; test robot 116 checks, 0 failures.


## 2.2: Your real CIBIL score, daily allowance, goals, and a full test robot (29 September 2026)

### New

- **Credit score page.** Add your real score from CIBIL, Experian, Equifax or CRIF High Mark:
  - **Type it in**, or **upload the free credit report PDF** (password-locked works). FinCopilot reads the score, bureau, report date, active accounts, overdue accounts and enquiries on your device, shows what it found, and you save it.
  - Score gauge with a band (Excellent / Good / Fair / Needs work / Poor), history chart, change since last time ("▼ Down 7 points since 14 Sept 2026"), and a reminder when the score is over 6 months old.
  - Links to the free yearly report from all four bureaus, and a plain explanation of why no app can fetch your CIBIL score without a paid bureau partnership and your PAN.
  - The FinCopilot estimate is shown underneath, so you can see what helps or hurts.
  - Home has a credit score card; the assistant answers "What is my CIBIL score?" with your real score.
- **"About ₹X a day until salary"** under the big number on Home: safe to spend divided by the days until your next salary (or month end), rounded down so it never overshoots.
- **Savings goals** (Insights): name, amount, saved so far, target date. Shows the monthly amount needed, a progress bar, and whether it fits what you usually have left each month (On track / Possible, but tight / More than you usually save / Reached).
- **Pay extra once** (EMI calculator): how much interest a one-time prepayment saves and how many months sooner the loan ends.
- **Try it with sample data**: one tap on the first screen (or Settings → Your data) loads a made-up person with 4 months of history, 2 EMIs, 3 credit scores and 2 goals. A banner makes clear it is sample data, and "Use my own data" clears it.
- **Works offline**: a service worker keeps the app's files, so after the first visit the app opens with no internet.
- The Home **EMI calculator** button now opens the calculator directly (it used to open the EMI list).
- New assistant questions: "What is my CIBIL score?" and "How are my goals going?". "How much can I spend?" now also gives the per-day amount.

### Fixed (found by the new tests)

- **History month totals were wrong with more than 200 transactions.** Totals were added up only from the rows on screen, so the month cut off at row 200 showed a partial total. Totals now always cover every transaction in the month, and the header says "120 of 180 shown" when rows are hidden.
- **Category percentages could add up to 99% or 101%** (for example three equal categories showed 33% each). They now always add up to exactly 100%.
- **Pay extra once after 0 EMIs saved nothing**: a lump sum paid before the first EMI was ignored. Fixed.
- **Credit report enquiries**: "Enquiries in last 30 days 1" was read as 30 enquiries. Now read as 1.
- **Restoring a backup dropped each EMI's start date**, which could move its first due date. Now kept. A backup with a broken entry (for example a score of "abc") now skips that entry instead of failing or breaking the screen.
- **Two credit scores on the same day** could swap order; the one added last now comes first.
- **Autopay after a long break**: if the app was not opened for several months, only the latest missed EMI was recorded, so months left and History were wrong. It now records every missed month (oldest first, up to 12, never more than the months left). Found by the test robot.
- **A blank "Months left" made a new loan show as already closed.** It is now required (0 means finished), and an EMI without it (from an old backup) is treated as still running and shows "Months left not set".
- "1 days late" now reads "1 day late".
- Accessibility: the chat "Read aloud" button was 16 px wide (now 32 px, above the 24 px minimum), and the buffer switch now has a proper name for screen readers.
- Layout: header buttons such as "Add score" no longer break onto two lines on small phones; score history bars show the day ("14 Sept") so two scores in one month are not both labelled "Sept 26".

### Tests

- **46 unit tests** (was 34): credit report reading for all four bureau layouts and "NH" reports, the password-locked credit report PDF, daily allowance, goals, prepayment, sample data on any day of the year, credit scores and goals in the store, restoring a damaged backup, and autopay catch-up after a long break.
- **Simulation** now also checks that the numbers tally: categories add up to total spending, percentages add up to 100, monthly totals match the transactions, "this month" matches the trend chart, the daily allowance never exceeds safe to spend, goal maths, prepayment never costs more, the assistant quotes the real CIBIL score, and autopay catch-up leaves no EMI late. Full run: 20,000 situations, **719,526 checks, 0 failures**.
- **New end-to-end robot** (`npm run test:e2e`): a real headless Chrome uses the built app like a person, **114 checks** from onboarding to offline mode. It now runs in GitHub Actions on every push.

---

## 2.1: No login (28 September 2026)

Sign-in was causing problems, so it has been removed.

- **The app opens straight to setup and then the dashboard.** No email, no password, no account.
- **Data is saved on the device** (browser storage) instead of Supabase. Every save is all-or-nothing, with a clear message if the device is full.
- **New in Settings → Your data:** Download backup, Restore from a backup file, and Delete all data on this device.
- Statement files are read on the device and no longer kept; their transactions are saved.
- Removed: sign-in, sign-up, password reset and change, account deletion, the Supabase client library, and the developer test mode (no longer needed without accounts).
- Kept for later: the Supabase schema in `supabase/migrations`, for cloud sync.
- 6 new tests for on-device saving, rules, the device-full case and backup/restore (34 in total).

---

# FinCopilot 2.0

**Date:** 28 September 2026

Version 1 was a demo UPI wallet: two fake accounts, fake payments with a PIN, and a small Express server. Version 2 turns it into a **real-world expense and EMI manager**: real sign-in, real data in a secure database, your own statements, and an AI that runs on your device.

---

## Added

**Accounts and data**
- Sign in, create account, email confirmation, forgot password, change password, sign out, delete account (Supabase Auth).
- Secure database in Supabase: profiles, transactions, EMIs and statements, with row-level security so each person can only reach their own rows.
- Private file storage for uploaded statements (each user has their own folder).
- Four-step setup for new users: about you → bank balance → safety buffer → theme.

**Your money**
- **Upload up to 5 statements at once:** PhonePe, Google Pay, Paytm, BHIM or any bank, as PDF (including password-locked), Excel (.xlsx) or CSV. Read on the device, then saved.
- **Preview with a tick for every transaction**, category change, filters (all / out / in / duplicates) and automatic duplicate detection across statements and saved data.
- **Add income or expenses by hand**, with automatic categories (18 categories, 150+ Indian merchant keywords).
- **Balance from transactions**: last bank figure + money in − money out, with a clear note of how it was worked out, and **Match with bank**, which explains any difference.
- **Safety buffer as your choice**: on or off, and any amount (presets or your own), in Settings.
- **History** page: search, filters, monthly totals, CSV download (safe against spreadsheet formula tricks), 200 rows at a time for speed.

**EMIs**
- Add, edit, delete, mark as paid, **autopay** (records the EMI as paid automatically on its due date), late-EMI banner, months left and % repaid, share of income going to EMIs.
- **EMI calculator**: monthly EMI, total interest, year-by-year schedule, fits-your-income check, "Add as EMI".

**Insights and advice**
- Safe-to-spend sum line by line, 7-day forecast, "Can I afford it?", spending pace against your usual month, category spikes, repeating payments, 6-month trend, calendar of money in and out, spending by category.
- **Credit health estimate** (300–900) with six factors and a tip for each.
- **Suggestions** ranked by urgency (late EMI, risk of falling short, overspending, high EMI burden, subscriptions, no buffer, and more).

**Assistant and AI**
- Ask questions in plain words; money decisions answered exactly from your numbers.
- **Offline AI**: Qwen 2.5 running in the browser (WebLLM + WebGPU), Smart or Lite, no API keys, nothing leaves the device.
- Safety: decisions always come from the calculator, and any AI answer with a rupee amount not in your data is replaced by the exact figures.

**Look and feel**
- **Six themes**: Purple (default, familiar payments-app look), Light, Dark, Doomsday, Saffron (navy, saffron and green), Ocean (navy and sky blue). All text meets WCAG AA contrast.
- Text size (Normal / Large / Extra large), read aloud, big buttons, plain words, works on small phones and desktops.

**Quality**
- 28 tests + a seeded simulation (**391,372 checks, 0 failures** in the full run), sample statements, a developer test mode (`npm run dev:mock`), GitHub Actions (tests, build, security audit).
- New reports: [TEST_REPORT.md](TEST_REPORT.md), this file, and rewritten [AUDIT_REPORT.md](AUDIT_REPORT.md), [UPGRADES.md](UPGRADES.md) and [README.md](README.md).

## Fixed

- **"Safe to spend" showed ₹0 after paying the EMI.** Now, with no EMI waiting, only your chosen buffer is kept aside.
- **One big payment made every day look expensive.** One-off payments over max(₹5,000, 20% of income) no longer count as usual daily spending.
- **The balance did not reflect transactions or the bank.** It is now worked out from your transactions, with a disclaimer and Match with bank.
- **Slow and missing updates** (Siddhartha → Rahul not showing, balances lagging). The old server kept data in a temporary folder on each Vercel copy. Data now lives in one real database, and all calculations run on your device, so updates show in about 20 ms.
- **EMIs due in 26–31 days could be paid twice.** Each payment now records the due date it covers.
- **Bank statements of overdraft accounts** had money in and out swapped (found by the simulation).
- **Short keywords** wrongly matched ("academic" looked like an EMI); they now match whole words only.

## Removed

- The demo accounts (Siddhartha and Rahul), the fake Pay, UPI PIN, Check balance and My QR screens, demo contacts and "demo" labels. Real UPI payments need an RBI/NPCI-licensed bank partner, so the app no longer pretends to move money.
- The Express/MongoDB backend and `api/` folder, and the in-browser fake API. Supabase replaces them.
- The single-file demo build and its scripts.
- Old screenshots (all retaken).

## Things you need to do

1. **Supabase → Authentication → URL Configuration:** set the Site URL and redirect URLs (see [README → Supabase setup](README.md#supabase-setup)), otherwise confirmation emails link to `localhost:3000`.
2. **Optional for the hackathon:** turn off "Confirm email", or add SMTP, because Supabase's free email sender is limited to a few emails per hour.
3. **Create your own account once** on the live site to confirm sign-up works end to end.
