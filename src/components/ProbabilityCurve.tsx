import { useEffect, useRef, useState } from 'react'
import type { Forecast } from '../data/schema'
import { horizonDate, monthLabel, pct, season } from '../lib/format'
import { HORIZONS, MONTHS } from '../lib/scoring'

function useWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(640)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, e.contentRect.width)))
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
  color: string
}

/** The trend's probability curve with its band. Click or drag to move the horizon. */
export function ProbabilityCurve({ forecast, m, onChange, editionDate, color }: Props) {
  const { ref, w } = useWidth()
  const h = 260
  const pad = { l: 36, r: 12, t: 16, b: 44 }
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
    const mo = Math.round(((clientX - r.left - pad.l) / iw) * MONTHS)
    onChange(Math.min(MONTHS, Math.max(0, mo)))
  }

  const seasons: { label: string; from: number }[] = []
  for (let i = 0; i <= MONTHS; i++) {
    const label = season(horizonDate(editionDate, i))
    if (!seasons.length || seasons[seasons.length - 1].label !== label) seasons.push({ label, from: i })
  }
  const labelLeft = x(m) > w - 150

  return (
    <div ref={ref} className="w-full select-none">
      <svg
        width={w}
        height={h}
        role="img"
        aria-label={`Probability curve; ${pct(cur.p)} at ${monthLabel(horizonDate(editionDate, m))}`}
        style={{ touchAction: 'pan-y', cursor: 'ew-resize' }}
        onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); pick(e.clientX, e.currentTarget) }}
        onPointerMove={(e) => dragging.current && pick(e.clientX, e.currentTarget)}
        onPointerUp={() => { dragging.current = false }}
      >
        {seasons.map((s, i) => (
          <g key={s.label}>
            {i % 2 === 1 && <rect x={x(s.from)} y={pad.t} width={x(seasons[i + 1]?.from ?? MONTHS) - x(s.from)} height={ih} fill="var(--paper-2)" />}
            <text x={x(s.from) + 4} y={h - 8} fontSize={10} fontFamily="var(--font-mono)" fill="var(--muted)" letterSpacing="0.08em">{s.label}</text>
          </g>
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <g key={p}>
            <line x1={pad.l} x2={w - pad.r} y1={y(p)} y2={y(p)} stroke={p === 0.5 ? 'var(--rule-strong)' : 'var(--rule)'} strokeDasharray={p === 0.5 ? '3 3' : undefined} />
            <text x={pad.l - 6} y={y(p) + 3.5} fontSize={10} textAnchor="end" fontFamily="var(--font-mono)" fill="var(--muted)">{p * 100}</text>
          </g>
        ))}
        {HORIZONS.map((hz) => (
          <text key={hz} x={x(hz)} y={h - 24} fontSize={10} textAnchor="middle" fontFamily="var(--font-mono)" fill={hz === m ? 'var(--ink)' : 'var(--muted)'}>
            {hz === 0 ? 'Now' : `${hz}M`}
          </text>
        ))}
        <path d={band} fill="var(--band)" />
        <path d={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
        <path d={line} fill="none" stroke="var(--ink)" strokeWidth={1} opacity={0.35} />
        <line x1={x(m)} x2={x(m)} y1={pad.t} y2={pad.t + ih} stroke="var(--accent)" />
        <line x1={x(m)} x2={x(m)} y1={y(cur.hi)} y2={y(cur.lo)} stroke="var(--accent)" strokeWidth={4} opacity={0.35} />
        <circle cx={x(m)} cy={y(cur.p)} r={5} fill="var(--accent)" stroke="var(--paper)" strokeWidth={2} />
        <text x={x(m) + (labelLeft ? -10 : 10)} y={Math.max(pad.t + 12, y(cur.p) - 10)} textAnchor={labelLeft ? 'end' : 'start'} fontFamily="var(--font-display)" fontSize={26} fill="var(--ink)">
          {pct(cur.p)}
        </text>
      </svg>
    </div>
  )
}
