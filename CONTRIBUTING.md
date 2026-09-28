# Contributing to FinCopilot

Thanks for helping. This guide covers setup, conventions and the checks a pull request needs to pass.

## Setup

```bash
git clone https://github.com/Jaya-Siddhartha/AI-Financial-Copilot.git
cd AI-Financial-Copilot
npm install && (cd backend && npm install) && (cd frontend && npm install)
npm run dev          # app on :5173, API on :5000, demo PIN 1234
```

## Workflow

1. Create a branch from `main`: `feature/<short-name>`, `fix/<short-name>` or `docs/<short-name>`.
2. Keep each pull request to one change. Describe what changed, why, and how you tested it.
3. Run the checks below before pushing.
4. Open a pull request against `main`.

## Checks

```bash
cd backend && npm test        # all API tests must pass
cd frontend && npm run build  # production build must succeed
```

If you change how the API behaves, also check the browser-only demo still matches the server:

```bash
cd frontend && node scripts/serve-browser-api.mjs 5055 &
cd ../backend && API_URL=http://127.0.0.1:5055/api npm test
```

## Where things live

- **Safe-to-spend rules:** `backend/src/services/financialEngine.js`. If you change them, update `frontend/src/lib/affordability.js` (the "Can I afford it?" simulator) to match. Test 13 fails if they disagree.
- **Storage, PIN checks, transfers:** `backend/src/services/dataService.js`. Always go through `dataService`, never `memoryStore` directly, so MongoDB and the JSON store behave the same.
- **API shapes:** controllers in `backend/src/controllers/`. The in-page demo API (`frontend/src/services/browserApi.js`) mirrors them. Change both together.
- **Demo data:** `backend/src/services/seedData.js` (used by the server and the browser demo).
- **Categories:** `backend/src/config/categories.js` and `frontend/src/constants/categories.js` must list the same names.
- **Design system:** colours, spacing and components are CSS variables and classes in `frontend/src/styles/index.css`. Reuse them instead of inline styles.

## Code style

- Match the surrounding code: ES modules, functional React components, 2-space indent, single quotes.
- Write interface text in plain language, from the user's point of view ("At risk", not "HIGH RISK Shortfall Warning").
- Use Lucide icons at the existing sizes and stroke width. No emojis in the interface.
- Add a test in `backend/tests/api.test.js` for any backend fix or new endpoint.

## Security

- Never commit `.env` files, `backend/data/` or `backend/backups/`. They are git-ignored.
- This is a demo: there's no login and PINs are stored in plain text. Don't connect real bank accounts or real money. See the P0 items in `UPGRADES.md` for what a production version needs.

## Ideas to work on

See `UPGRADES.md` for a prioritised list, such as QR scan and pay, EMI autopay reminders, dark mode, Hindi translations, and a better daily-spending estimate.
