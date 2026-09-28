import type { Adopter, Edition, EditionTrend, Forecast, Observation, Outcome, Signal, Source, Stage, Stance, Tier, Trend } from '../data/schema'

/**
 * The forecast model. Deterministic and pure: the same inputs always give the
 * same probabilities. Claude only gathers cited signals; this file sets the numbers.
 *
 * p(m) = probability that the trend is mainstream m months from the edition date.
 *   c  — when it peaks: the lifecycle stage blended with the timing each source family implies
 *   A  — how likely it is to be mainstream at its peak: starts from the stage (a trend
 *        already at peak *is* mainstream) and rises with independent evidence
 *   g  — asymmetric bell around c: fast rise (σ=4 mo), long plateau and decline (σ=10 mo; 6 once fading)
 * Two honesty terms pull p toward the stage's base rate:
 *   - disagreement: the share of evidence outside the largest agreeing group of sources
 *   - lead time: nobody forecasts fashion two years out, so skill decays with the horizon
 */

export const METHOD = 'wv-4'
export const HORIZONS = [0, 1, 3, 6, 12, 24, 36, 48] as const
export const MONTHS = 48
/** Beyond this, forecasts are mostly base rate and the UI says so. */
export const LONG_RANGE = 24

export const TIER_PRIOR: Record<Tier, number> = { data: 1, forecaster: 0.85, retail: 0.6, editorial: 0.55 }
export const STAGE_CENTRE: Record<Stage, number> = { emerging: 14, early: 8, rising: 4, peak: 0, fading: -6 }
/** Log-odds of being mainstream at peak before any evidence. Peak/fading trends have already got there. */
export const STAGE_LOGIT: Record<Stage, number> = { emerging: -1.8, early: -1.4, rising: -0.9, peak: 0.9, fading: 0.5 }
/** What p falls back to when evidence runs out: most trends never go mainstream; faded ones rarely return. */
export const STAGE_BASE: Record<Stage, number> = { emerging: 0.2, early: 0.2, rising: 0.2, peak: 0.2, fading: 0.05 }

const PRIOR_STRENGTH = 0.8
const EVIDENCE_GAIN = 1.4
const HALF_LIFE_DAYS = 180
const DECAY_FLOOR = 0.3
const SIGMA_BEFORE = 4
const SIGMA_AFTER = 10
const SIGMA_FADING = 6 // a trend already in decline loses search interest faster than a plateau
const SKILL_HORIZON = 36 // months; forecast weight = e^(−m/36): 85% at 6M, 51% at 2Y, 26% at 4Y
const AGREE_WINDOW = 9 // months; families whose peak timings fit in one window tell the same story
const PEAK_PLATEAU = 3 // months a "peaking" report implies the plateau continues
const MIN_TRACK_RECORD = 5
const LEAD_SLACK = 3 // months of tolerance around a source's lead range
const OUT_OF_RANGE = 0.5 // weight kept when a source speaks beyond how far it can see

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))
const logistic = (x: number) => 1 / (1 + Math.exp(-x))
const round = (x: number, d = 3) => Math.round(x * 10 ** d) / 10 ** d

function parse(d: string) {
  const [y, m, day] = d.split('-').map(Number)
  return { y, m, d: day ?? 15 }
}

/** Fractional months from `from` (YYYY-MM-DD) to `to` (YYYY-MM or YYYY-MM-DD). */
export function monthsBetween(from: string, to: string) {
  const a = parse(from)
  const b = parse(to)
  return (b.y - a.y) * 12 + (b.m - a.m) + (b.d - a.d) / 30.44
}

export function daysBetween(from: string, to: string) {
  return (Date.parse(to) - Date.parse(from)) / 86_400_000
}

export function addMonths(iso: string, months: number) {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCMonth(d.getUTCMonth() + months)
  return d.toISOString().slice(0, 10)
}

export function isoWeekId(iso: string) {
  const d = new Date(iso + 'T00:00:00Z')
  const day = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - day + 3) // Thursday of this week
  const year = d.getUTCFullYear()
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const week = 1 + Math.round(((d.getTime() - jan4.getTime()) / 86_400_000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}

export function decay(ageDays: number) {
  return Math.max(DECAY_FLOOR, 0.5 ** (Math.max(0, ageDays) / HALF_LIFE_DAYS))
}

/** When a single signal says the trend peaks, in months from the edition date. */
export function impliedCentre(s: Pick<Signal, 'stance' | 'date' | 'target'>, editionDate: string) {
  if (s.stance === 'rising') return monthsBetween(editionDate, s.target ?? editionDate)
  const at = Math.min(0, monthsBetween(editionDate, s.date))
  return s.stance === 'peaking' ? Math.min(0, at + PEAK_PLATEAU) : at - 5
}

export function signalWeight(s: Pick<Signal, 'strength' | 'date'>, sourceWeight: number, editionDate: string) {
  return sourceWeight * s.strength * decay(daysBetween(s.date, editionDate))
}

/** A source only fully counts for the time distance it can actually see (TikTok can't call 2029). */
export function leadFactor(centre: number, lead: [number, number]) {
  return centre >= lead[0] - LEAD_SLACK && centre <= lead[1] + LEAD_SLACK ? 1 : OUT_OF_RANGE
}

/**
 * Who is wearing the trend m months out (Rogers' adopter categories), from where
 * m sits relative to the trend's predicted peak c. A fading trend is never early.
 */
export function adopterAt(stage: Stage, centre: number, m: number): Adopter {
  const x = m - centre
  const phase: Adopter = x < -8 ? 'innovators' : x < -3 ? 'early-adopters' : x <= 3 ? 'early-majority' : x <= 12 ? 'late-majority' : 'laggards'
  if (stage === 'fading' && (phase === 'innovators' || phase === 'early-adopters' || phase === 'early-majority')) return 'late-majority'
  return phase
}

/** Independent source groups whose lead range covers month m: how much evidence speaks to that distance. */
export function coverageAt(signals: { sourceId: string }[], sources: Pick<Source, 'id' | 'family' | 'lead'>[], m: number) {
  const byId = new Map(sources.map((s) => [s.id, s]))
  const fams = new Set<string>()
  for (const s of signals) {
    const src = byId.get(s.sourceId)
    if (src && m >= src.lead[0] && m <= src.lead[1] + LEAD_SLACK) fams.add(src.family)
  }
  return fams.size
}

function bell(x: number, stage: Stage) {
  const sigma = x < 0 ? SIGMA_BEFORE : stage === 'fading' ? SIGMA_FADING : SIGMA_AFTER
  return Math.exp(-0.5 * (x / sigma) ** 2)
}

export interface WeightedSignal {
  family: string
  sourceId: string
  stance: Stance
  weight: number
  centre: number
}

/** The largest group of families whose timings fit inside one window (ties → more weight). */
function largestAgreement<T extends { centre: number; weight: number }>(families: T[]) {
  const sorted = [...families].sort((a, b) => a.centre - b.centre)
  let best: T[] = []
  let bestW = -1
  for (let i = 0; i < sorted.length; i++) {
    const group = sorted.filter((f) => f.centre >= sorted[i].centre && f.centre <= sorted[i].centre + AGREE_WINDOW)
    const w = group.reduce((a, f) => a + f.weight, 0)
    if (group.length > best.length || (group.length === best.length && w > bestW)) {
      best = group
      bestW = w
    }
  }
  return new Set(best)
}

export function forecastTrend(stage: Stage, signals: WeightedSignal[]): Forecast {
  // 1. Collapse each source family to one voice. Noisy-OR: repeat signals from
  //    the same family add confidence but can never exceed one full vote.
  const byFamily = new Map<string, WeightedSignal[]>()
  for (const s of signals) byFamily.set(s.family, [...(byFamily.get(s.family) ?? []), s])

  const families = [...byFamily.entries()].map(([family, list]) => {
    const weight = 1 - list.reduce((acc, s) => acc * (1 - clamp(s.weight, 0, 0.99)), 1)
    const total = list.reduce((a, s) => a + s.weight, 0) || 1
    const centre = list.reduce((a, s) => a + s.weight * s.centre, 0) / total
    const stanceWeight = new Map<Stance, number>()
    for (const s of list) stanceWeight.set(s.stance, (stanceWeight.get(s.stance) ?? 0) + s.weight)
    const stance = [...stanceWeight.entries()].sort((a, b) => b[1] - a[1])[0][0]
    return { family, sources: [...new Set(list.map((s) => s.sourceId))], weight, stance, centre }
  })

  // 2. Peak timing: stage prior blended with family timings.
  const evidence = families.reduce((a, f) => a + f.weight, 0)
  let centre = (PRIOR_STRENGTH * STAGE_CENTRE[stage] + families.reduce((a, f) => a + f.weight * f.centre, 0)) / (PRIOR_STRENGTH + evidence)
  if (stage === 'fading') centre = Math.min(centre, 0)

  // 3. Agreement: the biggest group of families telling the same timing story.
  const agreeing = largestAgreement(families)
  const spread = evidence > 0 ? Math.sqrt(families.reduce((a, f) => a + f.weight * (f.centre - centre) ** 2, 0) / evidence) : 0
  const conflict = evidence > 0 ? families.filter((f) => !agreeing.has(f)).reduce((a, f) => a + f.weight, 0) / evidence : 0

  // 4. Amplitude: the stage sets the starting odds, independent evidence moves them.
  const amplitude = Math.min(0.95, logistic(STAGE_LOGIT[stage] + EVIDENCE_GAIN * evidence))

  const base = STAGE_BASE[stage]
  const ps = Array.from({ length: MONTHS + 1 }, (_, m) => {
    const model = amplitude * bell(m - centre, stage)
    const skill = Math.exp(-m / SKILL_HORIZON)
    const informed = skill * model + (1 - skill) * base
    return clamp((1 - 0.4 * conflict) * informed + 0.4 * conflict * base, 0.02, 0.98)
  })
  // A fading trend can't gain probability later on.
  if (stage === 'fading') for (let m = 1; m < ps.length; m++) ps[m] = Math.min(ps[m], ps[m - 1])

  const halfWidth = 0.05 + 0.2 / (1 + 2 * evidence) + 0.012 * Math.min(spread, 12)
  const curve = ps.map((p, m) => {
    const hw = halfWidth * (1 + m / 30) * clamp(2 * Math.sqrt(p * (1 - p)) + 0.2, 0, 1)
    return { m, p: round(p), lo: round(clamp(p - hw, 0.01, 0.99)), hi: round(clamp(p + hw, 0.01, 0.99)) }
  })

  const peak = curve.reduce((best, pt) => (pt.p > best.p ? pt : best), curve[0])
  const inWindow = curve.filter((pt) => pt.p >= 0.8 * peak.p)
  const window: [number, number] | null = inWindow.length ? [inWindow[0].m, inWindow[inWindow.length - 1].m] : null

  return {
    curve,
    centre: round(centre, 2),
    amplitude: round(amplitude),
    peak: { m: peak.m, p: peak.p },
    window,
    consensus: {
      families: families
        .sort((a, b) => b.weight - a.weight)
        .map((f) => ({ ...f, agrees: agreeing.has(f), weight: round(f.weight), centre: round(f.centre, 1) })),
      agreeing: agreeing.size,
      total: families.length,
      agreement: round(evidence > 0 ? 1 - conflict : 0),
      evidence: round(evidence),
    },
  }
}

/** Track record: a source "called it" when its stance matched what happened. */
export function sourceTrackRecord(sources: Source[], signals: Signal[], outcomes: Outcome[], editionDates: Record<string, string>) {
  const stats = new Map<string, { n: number; hits: number }>()
  for (const o of outcomes) {
    const asOf = editionDates[o.edition]
    if (!asOf) continue
    const calls = signals.filter((s) => s.trendId === o.trendId && s.date <= asOf)
    for (const sourceId of new Set(calls.map((s) => s.sourceId))) {
      const last = calls.filter((s) => s.sourceId === sourceId).sort((a, b) => b.date.localeCompare(a.date))[0]
      const hit = (last.stance === 'declining') === (o.outcome === 0)
      const st = stats.get(sourceId) ?? { n: 0, hits: 0 }
      stats.set(sourceId, { n: st.n + 1, hits: st.hits + (hit ? 1 : 0) })
    }
  }
  return sources.map((src) => {
    const prior = TIER_PRIOR[src.tier]
    const st = stats.get(src.id)
    const hitRate = st && st.n > 0 ? st.hits / st.n : null
    const mult = st && st.n >= MIN_TRACK_RECORD && hitRate !== null ? clamp(0.6 + 0.8 * hitRate, 0.6, 1.4) : 1
    return { ...src, prior, weight: round(prior * mult), resolved: st?.n ?? 0, hitRate: hitRate === null ? null : round(hitRate) }
  })
}

export interface ScoreInput {
  date: string
  trends: Trend[]
  signals: Signal[]
  sources: Source[]
  outcomes: Outcome[]
  editionDates: Record<string, string>
  previous?: Edition | null
}

export function scoreEdition({ date, trends, signals, sources, outcomes, editionDates, previous }: ScoreInput): Edition {
  const weighted = sourceTrackRecord(sources, signals, outcomes, editionDates)
  const byId = new Map(weighted.map((s) => [s.id, s]))
  const active = trends.filter((t) => t.status === 'active')
  const prevById = new Map((previous?.trends ?? []).map((t) => [t.id, t]))

  const scored: EditionTrend[] = active.map((trend) => {
    const own = signals
      .filter((s) => s.trendId === trend.id && s.date <= date)
      .sort((a, b) => b.date.localeCompare(a.date))
    const ws = own.map((s) => {
      const src = byId.get(s.sourceId)
      if (!src) throw new Error(`Unknown source ${s.sourceId} on ${s.id}`)
      const centre = impliedCentre(s, date)
      const weight = signalWeight(s, src.weight, date) * leadFactor(centre, src.lead)
      return { signal: s, w: { family: src.family, sourceId: src.id, stance: s.stance, weight, centre } }
    })
    const forecast = forecastTrend(trend.stage, ws.map((x) => x.w))
    const prev = prevById.get(trend.id)
    const delta = prev
      ? Object.fromEntries(HORIZONS.map((h) => [String(h), round(forecast.curve[h].p - prev.forecast.curve[h].p)]))
      : null
    return {
      ...trend,
      signals: ws.map(({ signal, w }) => ({
        id: signal.id, sourceId: signal.sourceId, date: signal.date, dateApprox: signal.dateApprox,
        stance: signal.stance, strength: signal.strength, target: signal.target,
        url: signal.url, via: signal.via, summary: signal.summary, weight: round(w.weight),
      })),
      forecast,
      delta,
      isNew: !!previous && !prev,
    }
  })

  const activeIds = new Set(active.map((t) => t.id))
  return {
    id: isoWeekId(date),
    date,
    method: METHOD,
    horizons: [...HORIZONS],
    trends: scored.sort((a, b) => b.forecast.curve[3].p - a.forecast.curve[3].p),
    dropped: (previous?.trends ?? []).filter((t) => !activeIds.has(t.id)).map((t) => ({ id: t.id, name: t.name })),
    sources: weighted,
  }
}

export const RESOLVE_WINDOW_DAYS = 10

/**
 * Turn weekly observations into resolved predictions: a forecast made in
 * edition E for horizon h resolves against the observation of that trend
 * closest to E.date + h months (within ±10 days).
 */
export function resolveOutcomes(editions: Pick<Edition, 'id' | 'date' | 'trends'>[], observations: Observation[]) {
  const byTrend = new Map<string, Observation[]>()
  for (const o of observations) byTrend.set(o.trendId, [...(byTrend.get(o.trendId) ?? []), o])
  const outcomes: Outcome[] = []
  const unresolved: { trendId: string; edition: string; horizon: number; due: string }[] = []
  for (const ed of editions) {
    for (const h of HORIZONS.filter((h) => h > 0)) {
      const due = addMonths(ed.date, h)
      for (const t of ed.trends) {
        const obs = (byTrend.get(t.id) ?? [])
          .map((o) => ({ o, gap: Math.abs(daysBetween(due, o.date)) }))
          .filter((x) => x.gap <= RESOLVE_WINDOW_DAYS)
          .sort((a, b) => a.gap - b.gap)[0]
        if (obs) outcomes.push({ trendId: t.id, edition: ed.id, horizon: h, predicted: t.forecast.curve[h].p, outcome: obs.o.mainstream, resolvedOn: obs.o.date })
        else unresolved.push({ trendId: t.id, edition: ed.id, horizon: h, due })
      }
    }
  }
  return { outcomes, unresolved }
}

/** Brier score and calibration over resolved predictions. */
export function accuracy(outcomes: Outcome[]) {
  if (!outcomes.length) return { resolved: 0, brier: null, baselineBrier: null, bins: [] }
  const brier = outcomes.reduce((a, o) => a + (o.predicted - o.outcome) ** 2, 0) / outcomes.length
  const rate = outcomes.reduce((a, o) => a + o.outcome, 0) / outcomes.length
  const baselineBrier = outcomes.reduce((a, o) => a + (rate - o.outcome) ** 2, 0) / outcomes.length
  const edges = [0, 0.2, 0.4, 0.6, 0.8, 1.0001]
  const bins = edges.slice(0, -1).map((lo, i) => {
    const hi = edges[i + 1]
    const inBin = outcomes.filter((o) => o.predicted >= lo && o.predicted < hi)
    const n = inBin.length
    return {
      lo, hi: Math.min(hi, 1), n,
      predicted: n ? round(inBin.reduce((a, o) => a + o.predicted, 0) / n) : 0,
      observed: n ? round(inBin.reduce((a, o) => a + o.outcome, 0) / n) : 0,
    }
  })
  return { resolved: outcomes.length, brier: round(brier), baselineBrier: round(baselineBrier), bins }
}
