# FinCopilot Test Report

**Date:** 29 September 2026
**Version tested:** FinCopilot 2.2 (on-device data, statement upload, real CIBIL score from your credit report, daily allowance, savings goals, EMI tools, offline AI and offline app, six themes)
**Written for:** anyone, no technical background needed

---

## The short version

- **719,526 automatic checks, 0 failures.** A computer simulation played **20,000 random money situations** and **4,000 random bank and UPI statements**, and checked after each one that every number followed the rules and **added up** (the "data tally").
- **A test robot used the real app 114 ways, 0 failures.** It opens the built app in a real Chrome browser and taps, types and uploads like a person: setup, expenses, EMIs, 3 statements, the credit report PDF, goals, the assistant, all 6 themes, 4 screen sizes, backup, sample data, autopay after 100 days away, 5,000 transactions and no internet.
- **46 regular tests, all passing.**
- **The new tests found 9 real bugs, and all 9 are fixed** (listed in §4). The most important: History month totals were wrong for anyone with more than 200 transactions.
- **Speed:** with 5,000 transactions, Home opens in about **0.25 seconds**, History in **0.35 seconds**, and search answers in **0.04 seconds**. The money engine works out everything in **0.011 seconds**.
- **Your CIBIL score:** no app can fetch it for free without a paid bureau partnership and your PAN. FinCopilot reads the **free credit report PDF** you download yourself (§5).

---

## 1. What was tested

| Area | How it was tested | Result |
|---|---|---|
| Money maths (balance, safe to spend, EMIs, buffer, "Can I afford it?", per-day allowance) | 12 hand-written tests + 20,000 random situations + the robot checking the screen | All correct |
| Data tally (categories, percentages, monthly totals, History, Insights, Home all agree) | Simulation + robot comparing every figure on screen with the saved data | All correct after 2 fixes |
| Reading statements (PhonePe, Google Pay, Paytm, bank; PDF, Excel, CSV) | 7 tests, 3 realistic sample files, 4,000 random statements, robot upload | All correct |
| Reading credit reports (CIBIL, Experian, Equifax, CRIF, "NH", locked PDF) | 3 tests + a made-up password-locked CIBIL report + robot upload | All correct after 1 fix |
| EMI calculator, prepayment, credit estimate, goals, assistant | 13 tests + simulation (2,000 loans, 20,000 goals) | All correct after 1 fix |
| Saving on the device, backup and restore | 10 tests + robot downloading and restoring a real backup file | All correct after 1 fix |
| Every screen, 4 screen sizes, accessibility | Robot on 8 pages and 6 pop-up sheets at 360, 390, 768 and 1280 px wide | Works; 3 layout and accessibility issues fixed |
| Works offline | Robot turns the internet off and reloads | Opens from the service worker |
| Offline AI | Both models run on this computer's graphics card (tested in 2.0) | Works; safety checks in place |
| Colours and reading | Contrast of every text colour in all 6 themes (2.0) | All meet WCAG AA |

---

## 2. The simulation ("AI test run")

A simulation is like asking thousands of pretend users to use the app in random ways, then checking the results. It is repeatable: the same "seed" number always produces the same pretend users, so any problem can be replayed.

**What the pretend users did:** incomes from ₹0 to ₹2.5 lakh, salary on any day, buffer on or off at different amounts, no balance or any balance up to ₹1.5 lakh, up to 200 transactions each (₹1 to ₹60,000) over 5 months, up to 4 EMIs each on any due day from 1 to 31 (some paid, some late, some on autopay), a random savings goal, and random CIBIL scores. "Today" moved around, including month ends, 31 December and a leap day (29 February 2028).

**What was checked** (20,000 situations, seed 777):

| Rule | Times checked | Failures |
|---|---|---|
| Balance = last bank figure + money in − money out since then | 18,407 | 0 |
| Safe to spend = balance − EMIs due − usual spending − buffer | 18,407 | 0 |
| Safe to spend is never more than the balance, and never below ₹0 | 18,407 | 0 |
| The buffer is exactly what the user chose; turning it off never lowers safe to spend | 18,407 | 0 |
| The status (Safe / Be careful / At risk) matches the numbers | 18,407 | 0 |
| "Can I afford it?" = what the screen shows after really spending | 18,407 | 0 |
| **New:** per-day allowance × days never goes over safe to spend, and uses all of it | 18,407 | 0 |
| **New (tally):** categories add up to the total spent in 30 days | 20,000 | 0 |
| **New (tally):** category percentages add up to exactly 100% | 20,000 | 0 |
| **New (tally):** every monthly total matches the transactions; "this month" matches the chart | 20,000 | 0 |
| EMI countdown is 0 to 31 days with a valid status; a paid EMI is never late or paid twice | 40,178 | 0 |
| **New:** autopay catch-up lists every missed month in order, never in the future, within the months left, and leaves nothing late | 23,316 | 0 |
| Credit estimate is 300 to 900; **new:** factor weights add up to 100% | 20,000 | 0 |
| **New:** goal maths (progress 0–100%, monthly amount × months covers what is left) | 20,000 | 0 |
| **New:** paying extra on a loan never adds months or interest, EMI stays the same | 2,000 | 0 |
| The assistant always answers in words (never "undefined", "NaN" or blank) | 20,000 | 0 |
| **New:** the assistant quotes your real CIBIL score when you have added one | 1,094 | 0 |
| Statements: every transaction found; every amount, direction and date exact | 4,000 | 0 |
| 5,000 transactions worked out in under 0.15 seconds (took 0.011) | 1 | 0 |

**Total: 719,526 checks across 43 rules, 0 failures.** Full numbers: [docs/simulation-report.json](docs/simulation-report.json).

---

## 3. The test robot (real browser)

`npm run test:e2e` builds the app, starts it, and drives a real headless Chrome through it. It reads every figure off the screen and compares it with the saved data. **114 checks, 0 failures.** It also runs on GitHub on every push.

| Step | What the robot did and checked |
|---|---|
| Setup | Empty name refused, salary day 0 refused; then name, ₹60,000 income, ₹40,000 balance, ₹2,000 buffer. Home says "Hi, Asha" and safe to spend is **₹38,000**. |
| Per day | "About ₹19,000 a day for the next 2 days until salary": ₹19,000 × 2 = ₹38,000, never more. |
| Expenses | ₹500 expense → balance ₹39,500. ₹1,000 income → ₹40,500. Edit 500 → 700 → ₹40,300. Delete → ₹41,000. Empty amount refused. |
| EMIs | Bike loan ₹3,000 due in 5 days → safe to spend drops by exactly ₹3,000. "Paid it" → balance −₹3,000, EMI not kept aside again, payment linked in History. |
| Upload | Locked PhonePe PDF (with password), bank CSV and Google Pay Excel at once: **14 + 25 + 6** transactions, **5 duplicates** unticked, **40 added**, review totals equal the ticked rows. |
| History tally | Every month's money-out and money-in total equals the saved transactions; search shows only matches. |
| Insights tally | Balance − EMIs − everyday − buffer = safe to spend, and equals Home. Donut percentages add up to 100%, amounts add up to the 30-day total. "This month: spent" matches. |
| Buffer | ₹2,000 → ₹5,000 lowers safe to spend by exactly ₹3,000; off adds ₹2,000; on takes it back. |
| Calculator | Home's EMI calculator button opens the calculator. ₹5,00,000 at 10.5% for 3 years = **₹16,251**. "Pay extra once" matches the formula; ₹0 extra saves ₹0. |
| Credit score | 950 refused; 745 typed → gauge "745 · Good". Made-up locked CIBIL report: wrong password gives a clear message; right password reads **752, CIBIL, 14 Sept 2026, 3 active, 0 overdue, 1 enquiry**. History shows "Down 7 points". Home and the assistant show the real score. 4 free-report links. |
| Goals | Empty name refused; "New phone" ₹6,000 of ₹30,000 → progress 20%, monthly amount × months covers ₹24,000; saved ₹30,000 → "Reached"; delete. |
| Assistant | All 7 suggested questions answered, none with NaN or "undefined"; "How much can I spend?" quotes the Home figure. |
| Themes | All 6 apply, each with its own background; text size Normal < Large < Extra large; remembered. |
| Layout | 8 pages at 360, 390, 768 and 1280 px, plus 6 pop-up sheets at 360 px: nothing sticks out sideways; no "NaN", "undefined", "Infinity" or "[object Object]" anywhere; every button, link and field has a name for screen readers and is at least 24 × 24 px. |
| Backup | Download backup → a real file with everything → add an expense → restore → exactly the backed-up data is back. |
| Sample data | Loads "Priya" with a sample banner, no late EMI, 3 scores, 2 goals; "Use my own data" goes back to setup; "Try it with sample data" on setup works. |
| Autopay | A loan on autopay added 100 days ago, app not opened since: all 3 missed months recorded, months left down by 3, nothing shown as late. |
| Speed | 5,000 transactions: Home 0.24 s, History 0.36 s, search 0.04 s, Insights 0.10 s. Month totals still cover all 5,000, not just the 200 shown. |
| Offline | Internet off → the app still opens, served by its service worker. |
| Console | No errors. |

Full list: `frontend/tests/e2e-report.json` (created when you run it).

---

## 4. Bugs the testing found (all fixed)

**Found in this round (2.2):**

| # | What went wrong | How it was found | Fix |
|---|---|---|---|
| 1 | **History month totals were wrong with more than 200 transactions.** Only the rows on screen were added up, so the month cut off at row 200 showed too little. | Robot with 5,000 transactions | Totals always cover the whole month; the header says "120 of 180 shown" when rows are hidden |
| 2 | **Category percentages could add up to 99% or 101%** (three equal categories showed 33% each). | Tally check | Percentages are shared out so they always add up to exactly 100% |
| 3 | **"Pay extra once" after 0 EMIs saved nothing.** | Simulation of 2,000 loans | A lump sum before the first EMI now counts |
| 4 | **Credit report: "Enquiries in last 30 days 1" was read as 30 enquiries.** | Reading the made-up CIBIL PDF | The "last 30 days" part is skipped |
| 5 | **Restoring a backup lost each EMI's start date**, which could move its first due date; a broken entry could break the screen. | New store test | Start dates kept; broken entries skipped |
| 6 | **The chat "Read aloud" button was 16 px wide**, too small to tap reliably. | Robot's size check | Now 32 × 32 px |
| 7 | **The Home "EMI calculator" button opened the EMI list**, not the calculator. | Hands-on check | Opens the calculator directly |
| 8 | **Autopay after a long break recorded only the latest missed month** (3 months away → 1 payment), so months left and History were wrong. | Robot | Every missed month is recorded, oldest first |
| 9 | **A blank "Months left" made a new loan show as already closed.** | Reading the code while fixing #8 | The field is required; a missing value means "still running" |

Also fixed: "1 days late", header buttons breaking onto two lines on small phones, score history labels ("Sept 26" twice), the buffer switch's name for screen readers, same-day credit scores swapping order, and autopay catching up only one month after a long break.

**Found in 2.0 (still fixed):** overdraft bank statements had money in and out swapped; an EMI due in 26–31 days could be paid twice; the small AI model mixed up numbers; the AI approved purchases that would leave you short for an EMI. See [CHANGES.md](CHANGES.md).

---

## 5. Your CIBIL score: what works and why

**Why the app does not fetch it by itself.** TransUnion CIBIL, Experian, Equifax and CRIF High Mark only give scores to RBI-registered lenders and licensed partners, under a paid agreement, with the person's PAN and consent. PhonePe, Paytm and Google Pay can show a free score because they have such a partnership. There is no free public API, and asking people for their PAN would be a privacy risk.

**What FinCopilot does (tested):**

- Links to the **free full report** every bureau must give you once a year (RBI rule).
- **Reads the report PDF on your device**, including password-locked files: score, bureau, date, active and overdue accounts, enquiries. Tested with CIBIL, Experian, Equifax and CRIF text layouts, "NH" (no credit history) reports, version numbers such as "Score Version 3.0" (not mistaken for the score) and wrong passwords.
- Or you **type the score** from any app.
- History, change since last time, bands, a 6-month reminder, and the assistant uses it.

The test report file is a **made-up person** ("Asha Test Kumar"), clearly marked "sample for testing only". No real report was used.

---

## 6. The offline AI (tested in 2.0, unchanged)

Both models were downloaded and run on this computer's graphics card (NVIDIA, WebGPU).

| | Lite (about 400 MB) | Smart (about 1 GB, recommended) |
|---|---|---|
| Download and start | about 40 seconds | about 2 minutes |
| Answer time | 1.5–6.6 seconds | 2.5–5 seconds |

Money decisions (afford, loans, EMIs, safe to spend, credit score, goals) are always answered by the exact calculator. Any AI answer with a rupee amount that is not in your real data is replaced by the exact figures. Without WebGPU, the built-in assistant answers instantly.

---

## 7. What was not tested, and why

- **Fetching a real CIBIL score automatically.** Not possible without a licensed bureau partnership (§5). A real report was not used; the reader was tested with made-up reports in each bureau's layout. If your own report is not read correctly, you can type the score, and the layout can be added.
- **Your own real statements.** The reader handles the common layouts and 4,000 random ones. If a file is not read correctly, the preview lets you untick or fix rows.
- **Scanned (photographed) PDFs.** They contain pictures, not text, so they cannot be read. The app says so.
- **The offline AI on phones.** It needs WebGPU, which only some newer phones have.

---

## 8. How to run the tests yourself

```bash
cd frontend
npm install
npm test                                  # 46 tests, including a 3,000-situation simulation (about 15 seconds)
SIM_RUNS=20000 SIM_SEED=777 npm test      # the full simulation in this report (about 95 seconds)
npm run test:e2e                          # the test robot in headless Chrome or Edge (about 25 seconds)
```
