import type { Forecast } from '../data/schema'
import { MONTHS } from '../lib/scoring'

/** Mini probability curve with the confidence band and a marker at the selected month. */
export function Sparkline({ forecast, m, color = 'var(--ink)', height = 44 }: { forecast: Forecast; m: number; color?: string; height?: number }) {
  const w = 200
  const x = (i: number) => (i / MONTHS) * w
  const y = (p: number) => height - 2 - p * (height - 4)
  const line = forecast.curve.map((pt, i) => `${i ? 'L' : 'M'}${x(pt.m).toFixed(1)},${y(pt.p).toFixed(1)}`).join('')
  const band =
    forecast.curve.map((pt, i) => `${i ? 'L' : 'M'}${x(pt.m).toFixed(1)},${y(pt.hi).toFixed(1)}`).join('') +
    [...forecast.curve].reverse().map((pt) => `L${x(pt.m).toFixed(1)},${y(pt.lo).toFixed(1)}`).join('') +
    'Z'
  const cur = forecast.curve[m]
  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} preserveAspectRatio="none" aria-hidden>
      <line x1={0} x2={w} y1={y(0.5)} y2={y(0.5)} stroke="var(--rule)" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
      <path d={band} fill="var(--band)" />
      <path d={line} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      <line x1={x(m)} x2={x(m)} y1={0} y2={height} stroke="var(--accent)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <circle cx={x(m)} cy={y(cur.p)} r={2.5} fill="var(--accent)" />
    </svg>
  )
}
