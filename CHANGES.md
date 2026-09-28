# What changed in FinCopilot 2.0

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
