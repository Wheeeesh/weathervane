# Weathervane

A weekly fashion forecast. For every tracked trend: the probability it's mainstream
at any point over the next four years, how much the industry's sources agree, and
why — with every claim linked to its source.

**How it stays honest**

- **Claude gathers evidence; a formula sets the numbers.** Each week a scheduled
  Claude Routine reads the sources and records *signals* (who said what, rising or
  declining, when they expect it to land, with a link). `src/lib/scoring.ts` turns
  signals into probabilities. No probability is ever typed in by hand or by a model.
- **Every forecast gets scored.** Editions are frozen. Each week every trend is
  observed against a fixed test (in the new-in of ≥3 of Zara/H&M/Mango/COS/Uniqlo
  *and* search interest at or above its two-year average), and every past forecast
  falling due is resolved. The Accuracy page shows the Brier score and calibration
  once 20 calls have resolved. Sources earn or lose weight by their track record.

## Run it

```bash
npm install
npm run dev            # http://localhost:5173
```

## The weekly pipeline

```bash
npm run score -- 2026-09-28   # build the edition for a date → public/data/
npm run validate              # schema + cross-reference checks
npm run due                   # which trends need an observation this week
npm test
```

The Routine follows [ROUTINE.md](ROUTINE.md) every Monday, commits to `main`,
and GitHub Pages redeploys.

## Layout

| Path | What |
|---|---|
| `data/sources.json` | Sources, their tier and parent group ("family" — counted once) |
| `data/trends.json` | The trend registry: definition, stage, reasoning, what would change our mind |
| `data/signals/YYYY-Www.json` | Append-only weekly evidence |
| `data/observations.json` | Weekly mainstream yes/no per trend (resolves past forecasts) |
| `public/data/` | Generated: editions, index, history, accuracy — never edit by hand |
| `src/lib/scoring.ts` | The model |

## The model, in a paragraph

Each signal is weighted by source tier (data 1.0, forecaster 0.85, retail 0.6,
editorial 0.55), strength and freshness (six-month half-life). Signals from one
family combine by noisy-OR, so a group can never cast more than one vote. The
trend's peak month blends its lifecycle stage with the timing each family implies.
Lifecycle stage sets the starting odds of being mainstream at peak (a trend already
at peak *is* mainstream); independent evidence moves them, capped at 95%. The curve
rises fast and plateaus slowly (faster once fading). When families disagree on timing,
the band widens and p is pulled toward the stage's base rate. Forecast skill decays
with lead time (weight e^(−m/36)), so beyond two years every trend converges toward
its base rate — the UI labels that zone "long range · low confidence" on purpose.

## Sources & licences

Only short factual summaries and links are stored. No images or paywalled content
are reproduced. Paid platforms (WGSN, EDITED, full Tagwalk reports) are used only through
what they publish openly.
