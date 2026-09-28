# Weekly edition — Routine playbook

You are producing this week's Weathervane edition. Work in this repo. The number
of every probability comes from `src/lib/scoring.ts`; your job is evidence, not
opinions. Never invent a number, a date, a quote or a URL.

## 0. Setup
```bash
npm ci
DATE=$(date -u +%F)            # the edition date (a Monday)
WEEK=$(npx tsx -e "import('./src/lib/scoring.ts').then(m=>console.log(m.isoWeekId('$DATE')))")
```
If `public/data/editions/$WEEK.json` already exists and was committed today, stop: this week is done.

## 1. Research (the bulk of the work)
Search the past ~7 days (use WebSearch; restrict with `allowed_domains` to verify who said what).
Work the **source ladder**. Every week, search every band and say in your report which band had no new evidence:

| Band | Look at |
|---|---|
| Now–3 months | Google Trends, Lyst Index, StockX, The RealReal, ThredUp, Vestiaire, Depop, TikTok Creative Center, Pinterest Trends |
| 3–12 months | Tagwalk, Launchmetrics MIV, Heuritech, WWD (runway and retailer round-ups), FashionUnited, Style Arcade, Fashionista, Who What Wear |
| 1–2 years | Première Vision, Milano Unica, Pitti Filati, WGSN × Coloro colour, Pantone, Future Snoops, Pinterest Predicts |
| 2–4 years | WGSN macro and Future Consumer, BoF × McKinsey State of Fashion, Euromonitor, Future Snoops macro |

**Quality bar.** Only use sources in `data/sources.json` (grade A = measured data or published method; B = established trade or editorial authority). To add a source, give it `quality`, `basis` and `lead` (the months ahead it can see) and justify it in the commit message. Never add SEO sites, brand blogs or general lifestyle sites; `npm run validate` rejects unknown sources. vogue.com blocks this crawler, so use WWD and BoF for runway reporting.

Check the calendar: fashion weeks, fabric fairs (Première Vision in February and September, Pitti Filati in January and June), Lyst quarter releases, WGSN Colour of the Year (spring), Pinterest Predicts (December), State of Fashion (November), and earnings from LVMH, Kering and Inditex.

**Attribution rule.** Search summaries mix articles. Only record a claim if you've confirmed it on the publisher's own domain (a domain-restricted search or the page itself). If a number from Source A is reported by Outlet B, the signal's `sourceId` is A and `via` is B.

## 2. Write signals → `data/signals/$WEEK.json`
One JSON array. Each item:
```json
{ "id": "w41-001", "trendId": "lace", "sourceId": "heuritech", "date": "2026-10-02",
  "dateApprox": false, "stance": "rising", "strength": 0.7, "target": "2027-04",
  "url": "https://…", "via": "FashionUnited", "summary": "≤40 words, factual, what the source said" }
```
- `stance`: rising (source expects it to grow; **needs `target`** = month it expects it mainstream), peaking (it's at its height now), declining.
- `strength`: 0.85–0.9 hard data with big numbers · 0.6–0.75 clear, specific claim · 0.4–0.5 passing mention.
- `date` is the publication date; set `dateApprox: true` if you can't confirm the day.
- Don't re-add a signal that's already on file (same source + same claim). New claims from the same source are fine; the model counts a family once anyway.
- `sourceId` must exist in `data/sources.json`. Add a new source there if it's genuinely reputable; assign `family` to its parent group (e.g. Vogue and Vogue Business share `conde-nast`).

## 3. Update the trend registry → `data/trends.json`
- **New trend**: add only if ≥2 independent source families support it, or one data-tier source with strong numbers. Fill every field; `addedIn` = this week. Keep `reasoning` to 2–4 sentences, citing only signals on file.
- **Stage**: move a trend's `stage` only when evidence says so (e.g. showing up in mass-retail new-in: early → rising → peak).
- **Reasoning / wouldChange**: rewrite when this week's signals change the story.
- **Retire**: set `"status": "retired"` when a trend is folded into another or has had no signal for 12 weeks. Never delete — past editions reference it.

## 4. Observe → `data/observations.json`
```bash
npm run due -- $DATE
```
For each trend it lists, append one observation dated `$DATE`:
```json
{ "trendId": "lace", "date": "2026-10-26", "mainstream": 1, "evidence": "Lace tops in Zara, H&M, Mango new-in; Google Trends 'lace top' above 2-yr average" }
```
Mainstream = in the new-in of ≥3 of Zara, H&M, Mango, COS, Uniqlo **and** search interest at or above its two-year average. Check both. If you truly can't tell, skip it (it stays unresolved) — never guess.

## 5. Score, check, build
```bash
npm run score -- $DATE && npm run validate && npm test && npm run build
```
All four must pass. If anything fails, fix the **data** (never the tests, never the model to fit a result). If you can't fix it, don't push — end with a short failure report.

Sanity-read the score output: do the top 6-month calls make sense given this week's evidence? If a number looks wrong, the cause is a signal (wrong stance, target or strength) — correct the signal.

## 6. Commit & push
```bash
git add data public/data
git commit -m "Edition $WEEK: <n> new signals, <k> new trends, <j> observations"
git push origin main
```
GitHub Pages redeploys automatically.

## 7. Report (the run's final message)
Three lines max: headline move of the week, anything new or retired, validation status. Plus the site link.

## Changing the model
`src/lib/scoring.ts` is versioned (`METHOD`). Changing it changes future editions only; published editions stay frozen. Don't touch it in a weekly run.
