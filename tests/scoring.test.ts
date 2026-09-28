import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Signal, Source, Trend } from '../src/data/schema'
import { accuracy, forecastTrend, impliedCentre, isoWeekId, monthsBetween, resolveOutcomes, scoreEdition, type WeightedSignal } from '../src/lib/scoring'

const sig = (family: string, stance: WeightedSignal['stance'], centre: number, weight = 0.6): WeightedSignal => ({ family, sourceId: family, stance, centre, weight })

describe('dates', () => {
  it('computes ISO weeks', () => {
    expect(isoWeekId('2026-09-28')).toBe('2026-W40')
    expect(isoWeekId('2027-01-01')).toBe('2026-W53')
    expect(isoWeekId('2026-01-01')).toBe('2026-W01')
  })
  it('measures months', () => {
    // YYYY-MM targets mean mid-month.
    expect(monthsBetween('2026-09-28', '2027-04')).toBeCloseTo(6.57, 1)
    expect(impliedCentre({ stance: 'rising', date: '2026-09-01', target: '2027-03' }, '2026-09-28')).toBeCloseTo(5.57, 1)
    expect(impliedCentre({ stance: 'declining', date: '2026-09-01' }, '2026-09-28')).toBeLessThan(-5)
  })
})

describe('forecastTrend', () => {
  it('keeps every probability inside (0.02, 0.98) and every band around p', () => {
    for (const stage of ['emerging', 'early', 'rising', 'peak', 'fading'] as const) {
      for (const signals of [[], [sig('a', 'rising', 3, 0.99), sig('b', 'rising', 3, 0.99), sig('c', 'rising', 3, 0.99), sig('d', 'peaking', 0, 0.99)]]) {
        for (const pt of forecastTrend(stage, signals).curve) {
          expect(pt.p).toBeGreaterThanOrEqual(0.02)
          expect(pt.p).toBeLessThanOrEqual(0.98)
          expect(pt.lo).toBeLessThanOrEqual(pt.p)
          expect(pt.hi).toBeGreaterThanOrEqual(pt.p)
        }
      }
    }
  })

  it('never lets a fading trend gain probability later', () => {
    const f = forecastTrend('fading', [sig('a', 'rising', 12, 0.9), sig('b', 'declining', -6)])
    for (let m = 1; m < f.curve.length; m++) expect(f.curve[m].p).toBeLessThanOrEqual(f.curve[m - 1].p)
  })

  it('counts a source family once, however many signals it sends', () => {
    const one = forecastTrend('rising', [sig('vogue', 'rising', 4)])
    const spam = forecastTrend('rising', Array.from({ length: 10 }, () => sig('vogue', 'rising', 4)))
    const two = forecastTrend('rising', [sig('vogue', 'rising', 4), sig('lyst', 'rising', 4)])
    expect(spam.consensus.total).toBe(1)
    expect(spam.consensus.evidence).toBeLessThanOrEqual(1)
    expect(two.amplitude).toBeGreaterThan(one.amplitude)
  })

  it('more independent agreement raises the ceiling', () => {
    const a = forecastTrend('rising', [sig('a', 'rising', 4)])
    const b = forecastTrend('rising', [sig('a', 'rising', 4), sig('b', 'rising', 4), sig('c', 'rising', 5)])
    expect(b.peak.p).toBeGreaterThan(a.peak.p)
  })

  it('disagreement on timing widens the band and flags the dissenter', () => {
    const agree = forecastTrend('peak', [sig('a', 'peaking', 0), sig('b', 'peaking', 0)])
    const split = forecastTrend('peak', [sig('a', 'declining', -8), sig('b', 'rising', 9)])
    const width = (f: typeof agree) => f.curve[6].hi - f.curve[6].lo
    expect(width(split)).toBeGreaterThan(width(agree))
    expect(split.consensus.agreeing).toBeLessThan(split.consensus.total)
  })

  it('regresses far horizons toward the base rate', () => {
    const f = forecastTrend('peak', [sig('a', 'peaking', 0, 0.9), sig('b', 'peaking', 0, 0.9), sig('c', 'peaking', 0, 0.9)])
    expect(f.curve[0].p).toBeGreaterThan(0.8)
    expect(f.curve[48].p).toBeGreaterThan(0.1)
    expect(f.curve[48].p).toBeLessThan(0.25)
    expect(f.curve[48].hi - f.curve[48].lo).toBeGreaterThan(f.curve[0].hi - f.curve[0].lo)
  })

  it('moves the peak toward where the sources say it lands', () => {
    const early = forecastTrend('early', [sig('a', 'rising', 2, 0.9), sig('b', 'rising', 2, 0.9)])
    const late = forecastTrend('early', [sig('a', 'rising', 14, 0.9), sig('b', 'rising', 14, 0.9)])
    expect(early.peak.m).toBeLessThan(late.peak.m)
  })
})

describe('resolution', () => {
  const ed = {
    id: '2026-W40', date: '2026-09-28',
    trends: [{ id: 'x', forecast: { curve: Array.from({ length: 49 }, (_, m) => ({ m, p: 0.7, lo: 0.6, hi: 0.8 })) } }],
  } as never
  it('resolves a prediction against the observation nearest its due date', () => {
    const { outcomes } = resolveOutcomes([ed], [
      { trendId: 'x', date: '2026-10-26', mainstream: 1, evidence: 'in Zara, H&M, Mango new-in' },
      { trendId: 'x', date: '2026-12-28', mainstream: 0, evidence: 'gone from new-in' },
    ])
    expect(outcomes).toEqual([
      { trendId: 'x', edition: '2026-W40', horizon: 1, predicted: 0.7, outcome: 1, resolvedOn: '2026-10-26' },
      { trendId: 'x', edition: '2026-W40', horizon: 3, predicted: 0.7, outcome: 0, resolvedOn: '2026-12-28' },
    ])
  })
  it('ignores observations outside the ±10 day window', () => {
    const { outcomes } = resolveOutcomes([ed], [{ trendId: 'x', date: '2026-11-15', mainstream: 1, evidence: 'mid-way, matches nothing' }])
    expect(outcomes).toHaveLength(0)
  })
  it('scores Brier against the base rate', () => {
    const a = accuracy([
      { trendId: 'x', edition: '2026-W40', horizon: 1, predicted: 0.9, outcome: 1, resolvedOn: '2026-10-28' },
      { trendId: 'y', edition: '2026-W40', horizon: 1, predicted: 0.1, outcome: 0, resolvedOn: '2026-10-28' },
    ])
    expect(a.brier).toBeCloseTo(0.01)
    expect(a.baselineBrier).toBeCloseTo(0.25)
  })
})

describe('first edition data', () => {
  const read = (f: string) => JSON.parse(readFileSync(join(__dirname, '..', 'data', f), 'utf8'))
  const sources = z.array(Source).parse(read('sources.json'))
  const trends = z.array(Trend).parse(read('trends.json'))
  const signals = z.array(Signal).parse(read('signals/2026-W40.json'))

  it('scores end to end with sane output', () => {
    const ed = scoreEdition({ date: '2026-09-28', trends, signals, sources, outcomes: [], editionDates: {} })
    expect(ed.id).toBe('2026-W40')
    expect(ed.trends).toHaveLength(trends.length)
    const byId = Object.fromEntries(ed.trends.map((t) => [t.id, t]))
    // A fading trend should be less likely in a year than now; an early one more.
    expect(byId['quiet-luxury'].forecast.curve[12].p).toBeLessThan(byId['quiet-luxury'].forecast.curve[0].p)
    expect(byId['saturated-blue'].forecast.curve[6].p).toBeGreaterThan(byId['saturated-blue'].forecast.curve[0].p)
    // The contested trend is flagged as such.
    expect(byId['animal-print'].forecast.consensus.agreeing).toBeLessThan(byId['animal-print'].forecast.consensus.total)
  })
})
