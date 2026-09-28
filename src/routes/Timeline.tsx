import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { HorizonSlider } from '../components/HorizonSlider'
import { Loading } from '../components/Loading'
import { useEdition } from '../lib/data'
import { horizonDate, monthLabel, pct, season } from '../lib/format'
import { applyFilters, useViewParams } from '../lib/params'
import { MONTHS } from '../lib/scoring'

/** Every trend as a lane across the next 24 months; ink density = probability. */
export default function Timeline() {
  const { params, set, search, activeFilters, clearFilters } = useViewParams()
  const { edition, error } = useEdition(params.e)
  const trends = useMemo(
    () => (edition ? applyFilters(edition.trends, { ...params, sort: 'soonest' }) : []),
    [edition, params],
  )
  if (!edition) return <Loading error={error} />

  const at = horizonDate(edition.date, params.m)
  const markerLeft = `calc(13px + (100% - 26px) * ${params.m / MONTHS})`

  return (
    <div className="wrap pt-6">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-4">
        <div>
          <div className="eyebrow">Trend lifecycles, next 24 months</div>
          <h1 className="display" style={{ fontSize: 'clamp(34px, 6vw, 56px)' }}>
            {monthLabel(at)} <em className="muted" style={{ fontSize: '0.6em' }}>{season(at)}</em>
          </h1>
        </div>
        <div className="flex items-center gap-3 text-xs muted">
          <span className="flex items-center gap-1.5"><span style={{ width: 18, height: 10, background: 'var(--ink)', opacity: 0.15 }} /> unlikely</span>
          <span className="flex items-center gap-1.5"><span style={{ width: 18, height: 10, background: 'var(--ink)' }} /> near certain</span>
          <span className="flex items-center gap-1.5"><span style={{ width: 18, height: 10, border: '1.5px solid var(--accent)' }} /> peak window</span>
          {activeFilters > 0 && <button className="btn" onClick={clearFilters}>Clear {activeFilters} filter{activeFilters === 1 ? '' : 's'}</button>}
        </div>
      </div>

      <div className="lane" style={{ borderBottom: '1px solid var(--ink)', minHeight: 0 }}>
        <div className="eyebrow self-end pb-3">Drag to move through time</div>
        <HorizonSlider m={params.m} onChange={(m) => set({ m })} editionDate={edition.date} compact />
      </div>

      <div>
        {trends.map((t) => {
          const [a, b] = t.forecast.window ?? [0, 0]
          const p = t.forecast.curve[params.m].p
          return (
            <Link key={t.id} to={`/trend/${t.id}?${search}`} className="lane">
              <div className="lane-name">
                <span className="swatch-dot" style={{ background: t.swatch }} />
                <span className="truncate">{t.name}</span>
              </div>
              <div className="relative h-full" style={{ padding: '10px 13px' }}>
                <div className="relative" style={{ height: 20 }}>
                  <div className="absolute inset-0 flex">
                    {t.forecast.curve.slice(0, MONTHS).map((pt) => (
                      <div key={pt.m} style={{ flex: 1, background: 'var(--ink)', opacity: 0.06 + pt.p * 0.94 }} title={`${monthLabel(horizonDate(edition.date, pt.m))}: ${pct(pt.p)}`} />
                    ))}
                  </div>
                  {t.forecast.window && (
                    <div className="absolute" style={{ left: `${(a / MONTHS) * 100}%`, width: `${(Math.max(1, b - a) / MONTHS) * 100}%`, top: -3, bottom: -3, border: '1.5px solid var(--accent)', borderRadius: 2 }} />
                  )}
                </div>
                <span className="mono absolute text-[11px]" style={{ left: markerLeft, top: -1, transform: 'translateX(6px)', background: 'var(--paper)', padding: '0 3px' }}>
                  {pct(p)}
                </span>
              </div>
            </Link>
          )
        })}
        {!trends.length && <div className="py-16 text-center muted">No trends match your filters.</div>}
      </div>

      {/* Vertical horizon line, drawn over the lanes' track column. */}
      <style>{`a.lane > div:last-child::after{content:'';position:absolute;top:0;bottom:0;left:${markerLeft};width:1px;background:var(--accent);pointer-events:none}`}</style>
    </div>
  )
}
