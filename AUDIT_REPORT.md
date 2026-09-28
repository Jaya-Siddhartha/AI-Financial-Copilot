# FinCopilot 2.0: Audit Report

**Date:** 28 September 2026
**Scope:** the whole repository after the version 2 rebuild: `frontend/`, `supabase/`, CI, docs, and the live Supabase project's security settings
**Method:** full read of the source; 28 automated tests plus a seeded simulation (391,372 checks); a hands-on browser run of every screen on phone and desktop sizes; the offline AI run on real hardware; security probes against the live database; dependency audit

---

## 1. Summary

Version 2 replaces the demo wallet with a real expense and EMI manager: Supabase sign-in and storage, statement upload, EMI tools, a credit health estimate, an offline AI assistant and six themes.

| Area | Verdict |
|---|---|
| Money maths | **Sound.** Every rule held in 20,000 random situations, including month ends and a leap day. "Can I afford it?" reuses the engine, so it cannot disagree with the dashboard. |
| Statement reading | **Good for common layouts.** 4,000 random statements in five layouts read back exactly. Scanned PDFs cannot be read (stated clearly to the user). |
| Data security | **Strong.** Row-level security on every table and on file storage; signed-out access returns nothing. No secret keys in the app. |
| AI safety | **Controlled.** Money decisions never come from the language model, and unverifiable rupee amounts are rejected. |
| Usability | **Good.** Big type, plain words, six WCAG-AA themes, text size, read aloud, instant updates. |
| Dependencies | **0 known vulnerabilities** (`npm audit`). |

**Found and fixed during this audit: 4 high-severity bugs and 7 smaller issues** (see §3). **Open items: 6**, none blocking a hackathon launch (§4).

---

## 2. What was checked

| Check | Result |
|---|---|
| Unit tests (`npm test`) | 28 / 28 pass |
| Simulation, 20,000 situations + 4,000 statements (seed 777) | 391,372 checks, 0 failures |
| Production build | Pass. Main bundle 148 KB gzipped; PDF reader, Excel reader and AI load only when used |
| `npm audit` | 0 vulnerabilities |
| Contrast of all text colours, 6 themes | All ≥ 4.5:1 (WCAG AA) after one fix |
| Phone width 375 px | No horizontal scrolling |
| Supabase security advisor | 1 expected note (signed-in users may call `delete_my_account`, which only deletes their own account) |
| Signed-out API probes | Read → `[]`, write → 401, file list → `[]`, delete account → 401 |
| Offline AI on WebGPU (NVIDIA) | Lite and Smart models load and answer in 1.5–6.6 s |

---

## 3. Findings fixed in this version

| # | Severity | Finding | Fix |
|---|---|---|---|
| F1 | High | Safe to spend fell to ₹0 after paying an EMI, because 10 days of spending and a buffer were still kept aside with no EMI waiting | Nothing is kept for everyday spending when no EMI is waiting; the buffer is the user's choice |
| F2 | High | Balances lagged or differed between requests on Vercel, and transfers did not reach the other account (the old server's data lived in a per-instance temporary folder) | One Supabase database; all calculations on the device; optimistic updates |
| F3 | High | An EMI due in 26–31 days could be paid twice | Payments record `paid_through_date` (the due date covered) |
| F4 | High | The offline AI could state wrong amounts and approve risky purchases | Decision questions go to the calculator; rupee amounts in AI answers must match the user's data |
| F5 | Medium | Overdraft (negative-balance) bank statements had directions swapped | The running balance is read as a signed number |
| F6 | Medium | One large payment inflated "usual daily spending" | Payments over max(₹5,000, 20% of income) are treated as one-offs |
| F7 | Medium | Short keywords matched inside words ("academic" → EMI) | Keywords of four letters or fewer match whole words only |
| F8 | Low | A bank CSV was labelled "Paytm" from one row | The source is detected from the file name, header and bank columns |
| F9 | Low | The credit estimate reached 900 on 3 months of data | Added a "length of history" factor (10%) |
| F10 | Low | One text colour pair was below AA contrast (green on the darkest panel, Purple theme) | Darker green in light themes |
| F11 | Low | Minor copy and layout issues (balance note, upload button count, icon wrapping, donut colour) | Fixed |

## 4. Open items

| # | Severity | Item | Recommendation |
|---|---|---|---|
| O1 | Medium | Supabase Auth Site URL and redirect URLs are not set yet, so emails would link to `localhost:3000` | Set them in the Supabase dashboard (README → Supabase setup). The Supabase connector used here cannot change auth settings |
| O2 | Medium | Supabase's built-in email sender allows only a few emails per hour | Add SMTP (e.g. Resend or SES), or turn off email confirmation for a demo |
| O3 | Low | No rate limiting beyond Supabase's defaults | Supabase applies auth rate limits; add CAPTCHA on sign-up if abuse appears |
| O4 | Low | Scanned (image) PDFs cannot be read | Offer on-device OCR (e.g. Tesseract.js) as an optional step |
| O5 | Low | Statement layouts beyond the tested ones may need tuning | The preview lets users untick or re-categorise; add layouts as real files are reported |
| O6 | Low | The offline AI needs WebGPU; many phones cannot run it | The built-in assistant covers all questions; the AI is an extra |

## 5. Security design

- **Row-level security** on `profiles`, `transactions`, `emis` and `statements`: every policy checks `auth.uid()` against the row owner. Storage policies restrict each user to the folder named after their user ID.
- **No secrets in the app.** The Supabase publishable key is designed to be public; it can only do what the security rules allow.
- **Database constraints** (length limits, positive amounts, valid due days) back up the app's own validation.
- **Account deletion** removes the user's files and then the account; all rows cascade.
- **Statement files** are read on the device. The original is kept in private storage only so the user can open it again, and can be deleted at any time.
- **The AI** runs on the device; nothing typed into the assistant is sent anywhere.
- **CSV export** neutralises cells that spreadsheets would run as formulas.

## 6. Architecture notes

- Pure logic lives in `frontend/src/lib/` (engine, statement parser, categories, EMI maths, credit estimate, advisor), with no network or storage code, so it is fully unit-testable with a fixed "now".
- `frontend/src/data/store.js` is the only file that talks to Supabase. `mockStore.js` mirrors it for test mode and is excluded from production builds by a Vite alias (verified: the production bundle contains no test-mode code).
- The app is served as static files from Vercel; there is no custom server to scale or secure.

## 7. Version 1 audit

The previous audit (version 1: demo UPI wallet with an Express backend) is in the git history at commit `1d8e49a`. That code has been replaced, so its findings no longer apply.
