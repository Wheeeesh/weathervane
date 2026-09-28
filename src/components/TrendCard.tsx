import { Link } from 'react-router-dom'
import type { EditionTrend } from '../data/schema'
import { CATEGORY_LABEL, STAGE_LABEL, pct, signedPts, verdict } from '../lib/format'
import { nearestHorizon } from '../lib/params'
import { ConsensusMeter } from './ConsensusMeter'
import { Sparkline } from './Sparkline'

export function TrendCard({ trend, m, search, index }: { trend: EditionTrend; m: number; search: string; index: number }) {
  const pt = trend.forecast.curve[m]
  const d = trend.delta?.[String(nearestHorizon(m))]
  const thin = trend.forecast.consensus.total < 2
  return (
    <Link to={`/trend/${trend.id}?${search}`} className="card" style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}>
      <div className="swatch" style={{ background: trend.swatch }} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="tag mb-1.5">{CATEGORY_LABEL[trend.category]}</div>
          <div className="card-name">{trend.name}</div>
        </div>
        <span className={`stage stage-${trend.stage} shrink-0`}>{STAGE_LABEL[trend.stage]}</span>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="big-p">
            {Math.round(pt.p * 100)}
            <small>%</small>
          </div>
          <div className="mono text-xs muted mt-2">
            {verdict(pt.p)} · {pct(pt.lo)}–{pct(pt.hi)}
          </div>
        </div>
        <div className="text-right">
          {trend.isNew ? (
            <span className="tag" style={{ color: 'var(--accent)' }}>New this week</span>
          ) : d !== undefined ? (
            <span className={`mono text-sm ${d > 0.005 ? 'delta-up' : d < -0.005 ? 'delta-down' : 'muted'}`} title="Change vs last week, in percentage points">
              {d > 0.005 ? '▲' : d < -0.005 ? '▼' : '•'} {signedPts(d)} pts
            </span>
          ) : (
            <span className="tag">First edition</span>
          )}
        </div>
      </div>

      <Sparkline forecast={trend.forecast} m={m} />

      <div className="flex items-center justify-between gap-2">
        <ConsensusMeter consensus={trend.forecast.consensus} />
        {thin && <span className="thin" title="Only one independent source family so far — treat as an early signal">Thin evidence</span>}
      </div>
    </Link>
  )
}
