/**
 * Builds this week's edition from /data and writes /public/data.
 *   npm run score                 → edition for today
 *   npm run score -- 2026-09-28   → edition for a given date (re-running a week overwrites it)
 */
import { join } from 'node:path'
import { HORIZONS, accuracy, isoWeekId, resolveOutcomes, scoreEdition } from '../src/lib/scoring'
import type { Edition, EditionIndex, History } from '../src/data/schema'
import { OUT, loadEdition, loadIndex, loadObservations, loadSignals, loadSources, loadTrends, today, writeJson } from './io'

const date = process.argv[2] ?? today()
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Bad date ${date}; use YYYY-MM-DD`)
const id = isoWeekId(date)

const sources = loadSources()
const trends = loadTrends()
const signals = loadSignals()
const observations = loadObservations()
const index: EditionIndex = loadIndex() ?? { latest: id, editions: [] }

// Earlier editions are frozen; their resolved predictions feed source track records.
const earlier: Edition[] = index.editions.filter((e) => e.id < id).map((e) => loadEdition(e.id))
const past = resolveOutcomes(earlier, observations)
const editionDates = Object.fromEntries(earlier.map((e) => [e.id, e.date]))
const previous = earlier.length ? earlier[earlier.length - 1] : null

const edition = scoreEdition({ date, trends, signals, sources, outcomes: past.outcomes, editionDates, previous })
writeJson(join(OUT, 'editions', `${id}.json`), edition)

const later: Edition[] = index.editions.filter((e) => e.id > id).map((e) => loadEdition(e.id))
const all = [...earlier, edition, ...later]
writeJson(join(OUT, 'index.json'), {
  latest: all[all.length - 1].id,
  editions: all.map((e) => ({ id: e.id, date: e.date, trends: e.trends.length, signals: e.trends.reduce((a, t) => a + t.signals.length, 0) })),
})

// History of every trend across editions (for sparklines).
const history: History = {}
for (const ed of all) {
  for (const t of ed.trends) (history[t.id] ??= []).push({ edition: ed.id, p: HORIZONS.map((h) => t.forecast.curve[h].p) })
}
writeJson(join(OUT, 'history.json'), history)

// Accuracy over everything resolved so far, plus what's due.
const { outcomes, unresolved } = resolveOutcomes(all, observations)
const now = today()
const pending = unresolved.filter((u) => u.due <= now).length
const upcoming = unresolved.filter((u) => u.due > now).map((u) => u.due).sort()
writeJson(join(OUT, 'accuracy.json'), { ...accuracy(outcomes), nextResolution: upcoming[0] ?? null, pending })
writeJson(join(OUT, 'outcomes.json'), outcomes)

const top = [...edition.trends].sort((a, b) => b.forecast.curve[6].p - a.forecast.curve[6].p).slice(0, 5)
console.log(`Edition ${id} (${date}): ${edition.trends.length} trends, ${signals.length} signals on file, ${outcomes.length} predictions resolved.`)
console.log('Top at 6 months:')
for (const t of top) console.log(`  ${(t.forecast.curve[6].p * 100).toFixed(0).padStart(3)}%  ${t.name}`)
if (pending) console.log(`${pending} prediction(s) past due without an observation — run npm run due.`)
