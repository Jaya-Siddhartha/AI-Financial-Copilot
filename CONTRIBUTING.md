# Contributing to FinCopilot

Thanks for helping! FinCopilot is used by people of all ages, so every change should keep it simple, correct and private.

## Setup

```bash
cd frontend
npm install
npm run dev:mock     # the app with in-memory test data, no account needed
npm run dev          # the app against the Supabase project in src/config.js
```

Sample statements for the upload screen are in `frontend/tests/fixtures` (PhonePe sample password: `9876543210`).

## Before opening a pull request

```bash
cd frontend
npm test            # must pass: unit tests + 3,000-situation simulation
npm run build       # must succeed
```

GitHub Actions runs both, plus `npm audit`, on every push and pull request.

## Where things live

- **Money rules:** `src/lib/engine.js`. Add a test in `tests/engine.test.js` with a fixed `now`, and keep the simulation rules in `tests/simulation.test.js` true.
- **Statement layouts:** `src/lib/statementParser.js`. Add a sample to `tests/statements.test.js` (and a fixture file if you can share one without personal data).
- **Categories:** `src/lib/categories.js`. Keywords of four letters or fewer match whole words only.
- **Assistant:** `src/lib/advisor.js`. Money decisions must stay in `DECISION_INTENTS` so they are answered by the calculator, never the language model.
- **Database:** `supabase/migrations/`. Every new table needs row-level security with an owner check.
- **Data access:** only `src/data/store.js` talks to Supabase; mirror any change in `src/data/mockStore.js`.

## Style

- Plain words a 60-year-old understands: "Money out", not "Debit"; "Late", not "Delinquent".
- Colours come from the tokens at the top of `src/styles/index.css` (six themes); sizes in `rem`. Check Purple, Dark and Doomsday, and Extra large text.
- Tap targets at least 44 px. Never rely on colour alone; add words.
- No personal data in fixtures, logs or screenshots.

## Branches and commits

Branch from `main` (`feature/…`, `fix/…`), keep each pull request to one change, and describe what changed, why, and how you tested it.

## Good first issues

See [UPGRADES.md](UPGRADES.md): Hindi strings, more statement layouts, category learning, Web Push reminders.
