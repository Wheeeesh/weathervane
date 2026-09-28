/**
 * Guards the weekly pipeline: nothing gets committed unless inputs and
 * outputs are well-formed and cross-referenced. Exits non-zero on any error.
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { Accuracy, History } from '../src/data/schema'
import { OUT, loadEdition, loadIndex, loadObservations, loadSignals, loadSources, loadTrends, readJson, today } from './io'

const errors: string[] = []
const warnings: string[] = []
const fail = (m: string) => errors.push(m)

try {
  const sources = loadSources()
  const trends = loadTrends()
  const signals = loadSignals()
  const observations = loadObservations()

  const sourceIds = new Set(sources.map((s) => s.id))
  const trendIds = new Set(trends.map((t) => t.id))
  const dup = <T>(xs: T[]) => xs.filter((x, i) => xs.indexOf(x) !== i)

  for (const d of dup(sources.map((s) => s.id))) fail(`duplicate source id ${d}`)
  for (const d of dup(trends.map((t) => t.id))) fail(`duplicate trend id ${d}`)
  for (const d of dup(signals.map((s) => s.id))) fail(`duplicate signal id ${d}`)

  const now = today()
  for (const s of signals) {
    if (!sourceIds.has(s.sourceId)) fail(`signal ${s.id}: unknown source "${s.sourceId}"`)
    if (!trendIds.has(s.trendId)) fail(`signal ${s.id}: unknown trend "${s.trendId}"`)
    if (s.date > now) fail(`signal ${s.id}: dated in the future (${s.date})`)
  }
  for (const o of observations) {
    if (o.date > now) fail(`observation ${o.trendId}@${o.date}: dated in the future`)
  }
  // The source ladder: every time distance needs at least three grade-A sources that can see it.
  const BANDS: [string, number, number][] = [['0–3 months', 0, 3], ['3–12 months', 3, 12], ['1–2 years', 12, 24], ['2–4 years', 24, 48]]
  for (const [label, lo, hi] of BANDS) {
    const n = sources.filter((s) => s.quality === 'A' && s.lead[0] <= hi && s.lead[1] >= lo).length
    if (n < 3) fail(`source ladder: only ${n} grade-A source(s) cover ${label}`)
  }
  for (const s of sources) if (s.lead[0] > s.lead[1]) fail(`source ${s.id}: lead range is reversed`)

  for (const t of trends.filter((t) => t.status === 'active')) {
    const own = signals.filter((s) => s.trendId === t.id)
    if (!own.length) fail(`trend ${t.id}: active but has no signals`)
    else if (new Set(own.map((s) => sources.find((x) => x.id === s.sourceId)?.family)).size < 2)
      warnings.push(`trend ${t.id}: single source family (shown as thin evidence)`)
  }

  const index = loadIndex()
  if (!index) fail('public/data/index.json missing — run npm run score')
  else {
    for (const e of index.editions) {
      const path = join(OUT, 'editions', `${e.id}.json`)
      if (!existsSync(path)) {
        fail(`edition ${e.id} listed but missing`)
        continue
      }
      const ed = loadEdition(e.id)
      for (const t of ed.trends) {
        for (const pt of t.forecast.curve) {
          if (!(pt.lo <= pt.p && pt.p <= pt.hi)) fail(`${e.id}/${t.id}: band does not contain p at m=${pt.m}`)
          if (pt.p < 0.02 || pt.p > 0.98) fail(`${e.id}/${t.id}: p out of bounds at m=${pt.m}`)
        }
      }
    }
    readJson(join(OUT, 'history.json'), History)
    readJson(join(OUT, 'accuracy.json'), Accuracy)
    readJson(join(OUT, 'outcomes.json'), z.array(z.unknown()))
  }
} catch (e) {
  fail((e as Error).message)
}

for (const w of warnings) console.log(`warn  ${w}`)
if (errors.length) {
  for (const e of errors) console.error(`error ${e}`)
  console.error(`\n${errors.length} error(s). Fix before committing.`)
  process.exit(1)
}
console.log('Data valid.')
