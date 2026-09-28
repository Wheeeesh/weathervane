import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { EditionTrend } from '../data/schema'

export type SortKey = 'probability' | 'movers' | 'consensus' | 'soonest'

export interface ViewParams {
  m: number
  cat: string[]
  seg: string[]
  tier: string[]
  region: string[]
  stage: string[]
  minp: number
  minc: number
  sort: SortKey
  e: string | null
}

const LISTS = ['cat', 'seg', 'tier', 'region', 'stage'] as const
export const DEFAULT_M = 6

/** All view state lives in the URL so any view can be shared or bookmarked. */
export function useViewParams() {
  const [sp, setSp] = useSearchParams()

  const params: ViewParams = useMemo(() => {
    const list = (k: string) => (sp.get(k) ? sp.get(k)!.split(',').filter(Boolean) : [])
    const num = (k: string, d: number, lo: number, hi: number) => {
      const v = Number(sp.get(k))
      return sp.has(k) && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : d
    }
    const sort = sp.get('sort') as SortKey
    return {
      m: num('m', DEFAULT_M, 0, 48),
      cat: list('cat'), seg: list('seg'), tier: list('tier'), region: list('region'), stage: list('stage'),
      minp: num('minp', 0, 0, 100),
      minc: num('minc', 0, 0, 10),
      sort: ['probability', 'movers', 'consensus', 'soonest'].includes(sort) ? sort : 'probability',
      e: sp.get('e'),
    }
  }, [sp])

  const set = useCallback(
    (patch: Partial<ViewParams>) => {
      setSp(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [k, v] of Object.entries(patch)) {
            const empty = v === null || (Array.isArray(v) && !v.length) || (k === 'minp' && v === 0) || (k === 'minc' && v === 0) || (k === 'sort' && v === 'probability')
            if (empty) next.delete(k)
            else next.set(k, Array.isArray(v) ? v.join(',') : String(v))
          }
          return next
        },
        { replace: true },
      )
    },
    [setSp],
  )

  const activeFilters = LISTS.reduce((a, k) => a + params[k].length, 0) + (params.minp ? 1 : 0) + (params.minc ? 1 : 0)
  const clearFilters = () => set({ cat: [], seg: [], tier: [], region: [], stage: [], minp: 0, minc: 0 })

  return { params, set, activeFilters, clearFilters, search: sp.toString() }
}

export function applyFilters(trends: EditionTrend[], p: ViewParams) {
  const any = (sel: string[], vals: string[]) => !sel.length || vals.some((v) => sel.includes(v))
  const list = trends.filter(
    (t) =>
      any(p.cat, [t.category]) &&
      // "Womenswear" should still include unisex trends, and vice versa.
      (!p.seg.length || p.seg.includes(t.segment) || t.segment === 'unisex') &&
      any(p.tier, t.markets) &&
      (!p.region.length || any(p.region, t.regions) || t.regions.includes('global')) &&
      any(p.stage, [t.stage]) &&
      t.forecast.curve[p.m].p * 100 >= p.minp &&
      t.forecast.consensus.agreeing >= p.minc,
  )
  const at = (t: EditionTrend) => t.forecast.curve[p.m].p
  const move = (t: EditionTrend) => Math.abs(t.delta?.[String(nearestHorizon(p.m))] ?? 0)
  const sorters: Record<SortKey, (a: EditionTrend, b: EditionTrend) => number> = {
    probability: (a, b) => at(b) - at(a),
    movers: (a, b) => move(b) - move(a) || at(b) - at(a),
    consensus: (a, b) => b.forecast.consensus.agreement * b.forecast.consensus.evidence - a.forecast.consensus.agreement * a.forecast.consensus.evidence,
    soonest: (a, b) => a.forecast.centre - b.forecast.centre,
  }
  return list.sort(sorters[p.sort])
}

export function nearestHorizon(m: number) {
  const hs = [0, 1, 3, 6, 12, 24, 36, 48]
  return hs.reduce((best, h) => (Math.abs(h - m) < Math.abs(best - m) ? h : best), 0)
}
