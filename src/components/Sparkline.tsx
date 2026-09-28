import type { Forecast } from '../data/schema'
import { LONG_RANGE, MONTHS } from '../lib/scoring'

/** Mini probability curve with its band and a marker at the selected month. */
export function Sparkline({ forecast, m, height = 40 }: { forecast: Forecast; m: number; height?: number }) {
  const w = 240
  const x = (i: number) => (i / MONTHS) * w
  const y = (p: number) => height - 3 - p * (height - 6)
  const line = forecast.curve.map((pt, i) => `${i ? 'L' : 'M'}${x(pt.m).toFixed(1)},${y(pt.p).toFixed(1)}`).join('')
  const band =
    forecast.curve.map((pt, i) => `${i ? 'L' : 'M'}${x(pt.m).toFixed(1)},${y(pt.hi).toFixed(1)}`).join('') +
    [...forecast.curve].reverse().map((pt) => `L${x(pt.m).toFixed(1)},${y(pt.lo).toFixed(1)}`).join('') +
    'Z'
  const cur = forecast.curve[m]
  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} preserveAspectRatio="none" aria-hidden>
      <rect x={x(LONG_RANGE)} y={0} width={w - x(LONG_RANGE)} height={height} fill="var(--fill-2)" />
      <path d={band} fill="var(--accent-soft)" />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth={1.75} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <line x1={x(m)} x2={x(m)} y1={0} y2={height} stroke="var(--text-3)" strokeWidth={1} strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
      <circle cx={x(m)} cy={y(cur.p)} r={3} fill="var(--card)" stroke="var(--accent)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
