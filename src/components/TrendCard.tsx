import { Link } from 'react-router-dom'
import type { EditionTrend } from '../data/schema'
import { ADOPTER_LABEL, CATEGORY_LABEL, range, signedPts, verdict } from '../lib/format'
import { adopterAt } from '../lib/scoring'
import { nearestHorizon } from '../lib/params'
import { ConsensusMeter } from './ConsensusMeter'
import { Sparkline } from './Sparkline'

export function TrendCard({ trend, m, search, index }: { trend: EditionTrend; m: number; search: string; index: number }) {
  const pt = trend.forecast.curve[m]
  const d = trend.delta?.[String(nearestHorizon(m))]
  const thin = trend.forecast.consensus.total < 2
  const phase = adopterAt(trend.stage, trend.forecast.centre, m)
  return (
    <Link to={`/trend/${trend.id}?${search}`} className="card tile" style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 t-caption">
          <span className="dot" style={{ background: trend.swatch }} />
          {CATEGORY_LABEL[trend.category]}
        </span>
        <span className={`stage adopt-${phase}`} title="Who's wearing it at this date">{ADOPTER_LABEL[phase]}</span>
      </div>

      <div className="t-headline">{trend.name}</div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="num-xl">{Math.round(pt.p * 100)}<small>%</small></div>
          <div className="t-caption mt-1.5">{verdict(pt.p)} · {range(pt.lo, pt.hi)}</div>
        </div>
        <div className="t-caption text-right num">
          {trend.isNew ? (
            <span className="accent">New</span>
          ) : d !== undefined ? (
            <span className={d > 0.005 ? 'up' : d < -0.005 ? 'down' : ''} title="Change vs last week">{signedPts(d)} pts</span>
          ) : null}
        </div>
      </div>

      <Sparkline forecast={trend.forecast} m={m} />

      <div className="flex items-center justify-between gap-2">
        <ConsensusMeter consensus={trend.forecast.consensus} />
        {thin && <span className="t-footnote" title="Only one independent source group so far">Limited evidence</span>}
      </div>
    </Link>
  )
}
