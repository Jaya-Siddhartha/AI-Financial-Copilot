# FinCopilot Test Report

**Date:** 28 September 2026
**Version tested:** FinCopilot 2.0 (Supabase login and data, statement upload, EMI tools, offline AI, six themes)
**Written for:** anyone, no technical background needed

---

## The short version

- **391,372 automatic checks, 0 failures.** A computer "simulation" played 20,000 random money situations and 4,000 random bank and UPI statements, and checked after each one that every number still followed the rules.
- **28 regular tests, all passing**, plus a full hands-on run through every screen in a real browser, on a phone-sized screen and a desktop screen.
- **The testing found 4 real bugs, and all 4 are fixed** (listed below). This is the point of testing: finding problems before users do.
- **Speed:** adding an expense updates the screen in about **0.02 seconds**. Working out everything for someone with **5,000 transactions takes 0.02 seconds**. Nothing waits for the internet except saving.
- **Security:** someone who is not signed in can read **nothing** and change **nothing**. Each signed-in user can only see their own data.

---

## 1. What was tested

| Area | How it was tested | Result |
|---|---|---|
| Money maths (balance, safe to spend, EMIs, buffer, "Can I afford it?") | 12 hand-written tests + 20,000 random situations | All correct |
| Reading statements (PhonePe, Google Pay, Paytm, bank; PDF, Excel, CSV) | 7 hand-written tests, 3 realistic sample files, 4,000 random statements | All correct after one fix |
| EMI calculator, credit health estimate, AI assistant answers | 7 tests, including known loan maths | All correct |
| Every screen and button | Used by hand in a real browser (sign up, setup, upload, add expense, EMIs, settings, themes, assistant) | Works; 6 small issues fixed |
| Offline AI | Downloaded and ran both AI models on this computer's graphics card; asked 10 real questions | Works; 2 safety problems fixed |
| Database security | Tried to read and write data without signing in, and as a stranger | Blocked, as it should be |
| Phone screens | 375-pixel-wide screen (a small phone) | Fits; no sideways scrolling |
| Colours and reading | Contrast of every text colour in all 6 themes | All readable (meet the WCAG AA standard) |

---

## 2. The simulation ("AI test run")

A simulation is like asking thousands of pretend users to use the app in random ways, then checking the results. It is repeatable: the same "seed" number always produces the same pretend users, so any problem can be replayed.

**What the pretend users did:** different incomes (₹0 to ₹2.5 lakh), buffer on or off at different amounts, no balance or any balance up to ₹1.5 lakh, up to 200 transactions each (tiny to ₹60,000), up to 4 EMIs each on any due day from 1 to 31, some paid, some late, some on autopay. The "today" date moved around, including month ends, 31 December and a leap day (29 February 2028).

**What was checked every time** (20,000 situations, seed 777):

| Rule | Times checked | Failures |
|---|---|---|
| Balance = last bank figure + money in − money out since then | 18,336 | 0 |
| Safe to spend = balance − EMIs due − usual spending − buffer | 18,336 | 0 |
| Safe to spend is never more than the balance | 18,336 | 0 |
| The buffer is exactly what the user chose | 18,336 | 0 |
| The status (Safe / Be careful / At risk) matches the numbers | 18,336 | 0 |
| "Can I afford it?" gives exactly what the screen shows after really spending | 18,336 | 0 |
| Spending money never raises "safe to spend" | 18,336 | 0 |
| Turning the buffer off never lowers "safe to spend" | 18,336 | 0 |
| No EMI waiting → nothing is kept aside for everyday spending | 3,759 | 0 |
| EMI countdown is always 0 to 31 days, with a valid status | 39,922 | 0 |
| After paying, an EMI is never still marked late | 38,721 | 0 |
| An EMI cannot be paid twice for the same month | 16,023 | 0 |
| Credit health estimate always between 300 and 900 | 20,000 | 0 |
| The assistant always answers in words (never "undefined" or blank) | 20,000 | 0 |
| Money questions always get the exact calculator answer | 20,000 | 0 |
| **Statements:** every transaction found | 4,000 | 0 |
| **Statements:** every amount, direction (in/out) and date exact | 4,000 | 0 |

**Total: 391,372 checks, 0 failures.** Full numbers: [docs/simulation-report.json](docs/simulation-report.json). Run it yourself: `cd frontend && SIM_RUNS=20000 npm test`.

---

## 3. Bugs the testing found (all fixed)

| # | What went wrong | How it was found | Fix |
|---|---|---|---|
| 1 | **Bank statements for overdraft accounts** (balance below zero, like "−58,265.23") had money in and money out swapped. | Simulation: 84 of 600 random statements came back wrong | The reader now understands negative balances ("−" or "Dr") |
| 2 | **Paying an EMI that is due in 26–31 days did not count**, so it could be paid twice. | Earlier simulation (2 of 96 EMI payments) | Each payment now records the exact due date it covers |
| 3 | **The small AI model mixed up numbers** (it said ₹3,915 was kept for EMIs when it was ₹8,500). | Asking the AI real questions | Every rupee amount in an AI answer is checked against your real numbers. If any does not match, the exact figures are shown instead |
| 4 | **The AI said "good idea" to a purchase that would leave you short for your EMI**, and encouraged a loan for a trip. | Asking the AI real questions | Money decisions ("Can I afford…?", loans, EMIs, safe to spend) are always answered by the exact calculator. The AI only answers open questions like tips |

Smaller issues fixed during the hands-on run: a bank statement labelled "Paytm" because one row mentioned Paytm; the credit estimate showing a perfect 900 after only 3 months of data (it now also looks at how long your history is); the balance note reading oddly right after matching with the bank; the upload button counting files that were already read; icons wrapping above button text; the donut chart always using lime green instead of the theme colour.

---

## 4. Hands-on run (real browser)

Each step was done on the screen, the way a person would, in the app's test mode:

1. **Create an account** → setup screen appears. ✔
2. **Setup:** name, ₹50,000 income, salary on the 1st → bank balance ₹40,000 → buffer (Yes/No, suggested ₹2,500 = 5% of income) → pick a theme from 6. ✔ Home shows ₹37,500 safe to spend (₹40,000 − ₹2,500 buffer).
3. **Upload 3 statements at once:** a password-locked PhonePe PDF, a bank CSV and a Google Pay Excel file.
   - Without the password, the PDF said "This PDF is locked. Enter its password". ✔
   - With the password: 14 + 25 + 6 = 45 transactions read, with dates, times and categories right. ✔
   - **5 duplicates** (the same rent, Netflix and "Rahul" payments in both the PhonePe and bank statements) were found and unticked, so they were not counted twice. ✔
   - 40 transactions added. The advice immediately noticed "Spending faster than usual this month" and "More on Groceries this month" (₹5,060 against a usual ₹2,960), which matches the sample files. ✔
4. **Add an EMI** (Car loan ₹8,500 on the 7th, autopay on) → "due in 9 days", safe to spend dropped to ₹25,085 and the sum was shown line by line. ✔
5. **Add an expense** of ₹750 → balance and safe to spend updated in **21 milliseconds**; "Zomato dinner" was put in Food & Dining automatically. ✔
6. **Match with bank:** typed ₹38,000 → "That is ₹1,250 less than the app worked out…" → balance corrected. ✔
7. **Mark the EMI as paid** → "All EMIs are paid for now"; safe to spend = balance − buffer only (₹24,500). This fixes the earlier "₹0 after paying the EMI" problem. ✔
8. **Buffer:** changed ₹2,500 → ₹5,000 → safe to spend dropped by exactly ₹2,500. ✔
9. **Themes:** Purple, Light, Dark, Doomsday, Saffron and Ocean all switch instantly and are remembered. ✔
10. **Assistant:** 7 built-in questions and 10 questions to the offline AI (see below). ✔
11. **Phone size:** Home, EMIs and the calculator fit a 375-pixel screen with no sideways scrolling. ✔

---

## 5. The offline AI

Both models were downloaded and run on this computer's graphics card (NVIDIA, WebGPU), with no internet needed after the download.

| | Lite (about 400 MB) | Smart (about 1 GB, recommended) |
|---|---|---|
| Download and start | about 40 seconds | about 2 minutes |
| Answer time | 1.5–6.6 seconds | 2.5–5 seconds |
| Good at | Short general tips | Clear tips and explanations |
| Problem found | Mixed up numbers | Agreed to risky purchases |

**How it is kept safe now:**
- Questions about money decisions are answered by the exact calculator (0.4 seconds): "Can I afford a ₹30,000 phone?" → "Not right now. Spending ₹30,000 could leave you ₹2,415 short for your Car loan EMI."
- Open questions ("Give me 3 tips to spend less on food") go to the AI.
- Any AI answer with a rupee amount that is not in your real data is replaced by the exact figures.
- Where the AI cannot run (older phones and browsers without WebGPU), the built-in assistant answers instead, instantly.

---

## 6. Security check (the real database)

| Test | Expected | Result |
|---|---|---|
| Read transactions without signing in | Nothing | `[]` (nothing) ✔ |
| Add a transaction without signing in | Refused | `401 Unauthorized` ✔ |
| List uploaded statement files without signing in | Nothing | `[]` ✔ |
| Delete an account without signing in | Refused | `401` ✔ |
| Signed-in stranger reads other users' data | Nothing | 0 rows ✔ |
| Security rules in place | 8 rules | All 8 present ✔ |
| Supabase security advisor | No problems | 1 expected note: "delete my account" is allowed for signed-in users, which is intended |

---

## 7. What was not tested, and why

- **Signing up with a real email on the live Supabase project.** My safety rules do not allow me to create accounts or sign in on an outside service. The full sign-in flow was tested in the app's test mode, which uses the same screens and rules. **Please create your own account once** to confirm the confirmation email arrives (see the setup note in the README).
- **Your own real statements.** Every bank and app lays statements out slightly differently. The reader handles the common layouts and the random ones above. If one of your files is not read correctly, the preview lets you untick or fix rows before saving, and the layout can be added.
- **Scanned (photographed) PDFs.** They contain pictures, not text, so they cannot be read. The app says so clearly.

---

## 8. How to run the tests yourself

```bash
cd frontend
npm install
npm test                                  # 28 tests, including a 3,000-situation simulation (about 15 seconds)
SIM_RUNS=20000 SIM_SEED=777 npm test      # the full simulation in this report (about 90 seconds)
npm run dev:mock                          # the app in test mode, no account needed
```
