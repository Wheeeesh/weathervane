/**
 * Lists the trends that need a mainstream observation this week, so past
 * predictions can resolve. The Routine appends one entry per trend to
 * data/observations.json.
 *   npm run due               → as of today
 *   npm run due -- 2026-10-28 → as of a date
 */
import { RESOLVE_WINDOW_DAYS, daysBetween, resolveOutcomes } from '../src/lib/scoring'
import { loadEdition, loadIndex, loadObservations, today } from './io'

const asOf = process.argv[2] ?? today()
const index = loadIndex()
if (!index) {
  console.log('No editions yet.')
  process.exit(0)
}
const editions = index.editions.map((e) => loadEdition(e.id))
const { unresolved } = resolveOutcomes(editions, loadObservations())
const open = unresolved.filter((u) => Math.abs(daysBetween(asOf, u.due)) <= RESOLVE_WINDOW_DAYS)

if (!open.length) {
  console.log(`Nothing to observe as of ${asOf}.`)
  process.exit(0)
}

const byTrend = new Map<string, typeof open>()
for (const u of open) byTrend.set(u.trendId, [...(byTrend.get(u.trendId) ?? []), u])
const latestTrend = (id: string) => {
  for (const ed of [...editions].reverse()) {
    const t = ed.trends.find((x) => x.id === id)
    if (t) return t
  }
}

console.log(`${byTrend.size} trend(s) need an observation dated ${asOf}. For each, decide mainstream 0/1 using the criterion:`)
console.log('  Mainstream = widely stocked at mass-market retail (≥3 of Zara, H&M, Mango, COS, Uniqlo new-in)')
console.log('               AND search interest at or above its trailing 2-year average.\n')
for (const [id, list] of byTrend) {
  const t = latestTrend(id)
  console.log(`- ${id} (${t?.name}) — search term "${t?.searchTerm}"; resolves ${list.length} prediction(s): ${list.map((u) => `${u.edition}+${u.horizon}m`).join(', ')}`)
}
