import { useEffect, useRef, useState } from 'react'
import type { Forecast } from '../data/schema'
import { horizonDate, horizonShort, monthLong, pct } from '../lib/format'
import { LONG_RANGE, MONTHS } from '../lib/scoring'
import { PRESETS } from './HorizonSlider'

function useWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(640)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, e.contentRect.width)))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return { ref, w }
}

interface Props {
  forecast: Forecast
  m: number
  onChange: (m: number) => void
  editionDate: string
}

/** Probability over the next four years. Tap or drag to move the horizon. */
export function ProbabilityCurve({ forecast, m, onChange, editionDate }: Props) {
  const { ref, w } = useWidth()
  const h = 240
  const pad = { l: 30, r: 8, t: 12, b: 28 }
  const iw = w - pad.l - pad.r
  const ih = h - pad.t - pad.b
  const x = (mo: number) => pad.l + (mo / MONTHS) * iw
  const y = (p: number) => pad.t + (1 - p) * ih
  const line = forecast.curve.map((pt, i) => `${i ? 'L' : 'M'}${x(pt.m)},${y(pt.p)}`).join('')
  const band =
    forecast.curve.map((pt, i) => `${i ? 'L' : 'M'}${x(pt.m)},${y(pt.hi)}`).join('') +
    [...forecast.curve].reverse().map((pt) => `L${x(pt.m)},${y(pt.lo)}`).join('') + 'Z'
  const cur = forecast.curve[m]
  const dragging = useRef(false)

  const pick = (clientX: number, el: SVGSVGElement) => {
    const r = el.getBoundingClientRect()
    onChange(Math.min(MONTHS, Math.max(0, Math.round(((clientX - r.left - pad.l) / iw) * MONTHS))))
  }
  const text = { fontSize: 11, fill: 'var(--text-3)', fontFamily: 'var(--font)' }

  return (
    <div ref={ref} className="w-full select-none">
      <svg
        width={w}
        height={h}
        role="img"
        aria-label={`Probability curve; ${pct(cur.p)} in ${monthLong(horizonDate(editionDate, m))}`}
        style={{ touchAction: 'pan-y', cursor: 'pointer', display: 'block' }}
        onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); pick(e.clientX, e.currentTarget) }}
        onPointerMove={(e) => dragging.current && pick(e.clientX, e.currentTarget)}
        onPointerUp={() => { dragging.current = false }}
      >
        <rect x={x(LONG_RANGE)} y={pad.t} width={x(MONTHS) - x(LONG_RANGE)} height={ih} fill="var(--fill-2)" rx={6} />
        <text x={x(LONG_RANGE) + 8} y={pad.t + 16} {...text}>Long range</text>
        {[0, 0.5, 1].map((p) => (
          <g key={p}>
            <line x1={pad.l} x2={w - pad.r} y1={y(p)} y2={y(p)} stroke="var(--sep)" />
            <text x={pad.l - 8} y={y(p) + 4} textAnchor="end" {...text}>{p * 100}</text>
          </g>
        ))}
        {PRESETS.filter((hz, i) => i === 0 || x(hz) - x(PRESETS[i - 1]) >= 34 || hz === m).map((hz) => (
          <text key={hz} x={x(hz)} y={h - 8} textAnchor={hz === 0 ? 'start' : hz === MONTHS ? 'end' : 'middle'} {...text} fill={hz === m ? 'var(--text)' : 'var(--text-3)'}>
            {horizonShort(hz)}
          </text>
        ))}
        <path d={band} fill="var(--accent-soft)" />
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        <line x1={x(m)} x2={x(m)} y1={pad.t} y2={pad.t + ih} stroke="var(--text-3)" strokeDasharray="3 3" />
        <circle cx={x(m)} cy={y(cur.p)} r={6} fill="var(--card)" stroke="var(--accent)" strokeWidth={3} />
      </svg>
    </div>
  )
}
