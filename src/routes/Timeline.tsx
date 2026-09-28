import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { HorizonSlider, THUMB_INSET } from '../components/HorizonSlider'
import { Loading } from '../components/Loading'
import { useEdition } from '../lib/data'
import { horizonDate, horizonName, monthLabel, monthLong, pct, season } from '../lib/format'
import { applyFilters, useViewParams } from '../lib/params'
import { LONG_RANGE, MONTHS } from '../lib/scoring'

/** Every trend as a lane across the next four years; blue intensity = probability. */
export default function Timeline() {
  const { params, set, search, activeFilters, clearFilters } = useViewParams()
  const { edition, error } = useEdition(params.e)
  const trends = useMemo(() => (edition ? applyFilters(edition.trends, { ...params, sort: 'soonest' }) : []), [edition, params])
  if (!edition) return <Loading error={error} />

  const at = horizonDate(edition.date, params.m)
  const frac = (m: number) => `${(m / MONTHS) * 100}%`

  return (
    <div className="wrap pt-14">
      <div className="t-hero">Timeline</div>
      <p className="t-sub mt-1.5 max-w-xl">
        When each trend is most likely to be mainstream. Darker means more likely; the outline marks its peak window.
      </p>

      <div className="card mt-8 overflow-hidden">
        <div className="lane" style={{ alignItems: 'start', paddingTop: 16, paddingBottom: 12 }}>
          <div>
            <div className="t-headline">{monthLong(at)}</div>
            <div className="t-caption">{season(at)} · {horizonName(params.m)}</div>
          </div>
          <HorizonSlider m={params.m} onChange={(m) => set({ m })} editionDate={edition.date} compact />
        </div>

        {trends.map((t) => {
          const w = t.forecast.window
          const p = t.forecast.curve[params.m].p
          return (
            <Link key={t.id} to={`/trend/${t.id}?${search}`} className="lane">
              <div className="lane-name">
                <span className="dot" style={{ background: t.swatch }} />
                <span className="truncate">{t.name}</span>
              </div>
              <div className="relative" style={{ padding: `0 ${THUMB_INSET}px` }}>
                <div className="capsule">
                  {t.forecast.curve.slice(0, MONTHS).map((pt) => (
                    <div key={pt.m} style={{ flex: 1, background: 'var(--accent)', opacity: 0.04 + pt.p * 0.96 }} title={`${monthLabel(horizonDate(edition.date, pt.m))}: ${pct(pt.p)}`} />
                  ))}
                  <div className="absolute top-0 bottom-0" style={{ left: frac(LONG_RANGE), right: 0, background: 'repeating-linear-gradient(135deg, transparent 0 4px, var(--fill-2) 4px 8px)' }} />
                  {w && (
                    <div className="absolute top-0 bottom-0" style={{ left: frac(w[0]), width: frac(Math.max(1, w[1] - w[0])), border: '2px solid var(--accent)', borderRadius: 9 }} />
                  )}
                </div>
                <div className="absolute top-[-6px] bottom-[-6px] pointer-events-none" style={{ left: `calc(${THUMB_INSET}px + (100% - ${THUMB_INSET * 2}px) * ${params.m / MONTHS})`, width: 1.5, background: 'var(--text)' }} />
                <span className="absolute t-footnote num pointer-events-none" style={{ left: `calc(${THUMB_INSET}px + (100% - ${THUMB_INSET * 2}px) * ${params.m / MONTHS} + 6px)`, top: -2, color: 'var(--text)', background: 'var(--card)', padding: '0 4px', borderRadius: 4, fontWeight: 600 }}>
                  {pct(p)}
                </span>
              </div>
            </Link>
          )
        })}
        {!trends.length && <div className="py-16 text-center t-sub">No trends match your filters.</div>}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 t-footnote">
        <span className="flex items-center gap-2"><span className="dot" style={{ background: 'var(--accent)', opacity: 0.15 }} /> Unlikely</span>
        <span className="flex items-center gap-2"><span className="dot" style={{ background: 'var(--accent)' }} /> Near certain</span>
        <span className="flex items-center gap-2"><span style={{ width: 16, height: 10, borderRadius: 5, background: 'repeating-linear-gradient(135deg, transparent 0 3px, var(--fill) 3px 6px)' }} /> Beyond 2 years: long range, low confidence</span>
        {activeFilters > 0 && <button className="btn link" onClick={clearFilters}>Clear {activeFilters} filter{activeFilters === 1 ? '' : 's'}</button>}
      </div>
    </div>
  )
}
