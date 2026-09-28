import type { ReactNode } from 'react'
import { Loading } from '../components/Loading'
import { useAccuracy } from '../lib/data'
import { longDate } from '../lib/format'

const MIN_FOR_CHART = 20

function Calibration({ bins }: { bins: { lo: number; hi: number; n: number; predicted: number; observed: number }[] }) {
  const s = 280
  const pad = 32
  const x = (p: number) => pad + p * (s - pad * 1.5)
  const y = (p: number) => s - pad - p * (s - pad * 1.5)
  const max = Math.max(...bins.map((b) => b.n), 1)
  const text = { fontSize: 10, fill: 'var(--text-3)', fontFamily: 'var(--font)' }
  return (
    <svg viewBox={`0 0 ${s} ${s}`} width="100%" style={{ maxWidth: 340 }} role="img" aria-label="Calibration: what we said versus what happened">
      {[0, 0.5, 1].map((p) => (
        <g key={p}>
          <line x1={x(0)} x2={x(1)} y1={y(p)} y2={y(p)} stroke="var(--sep)" />
          <text x={x(0) - 6} y={y(p) + 3} textAnchor="end" {...text}>{p * 100}</text>
          <text x={x(p)} y={y(0) + 14} textAnchor="middle" {...text}>{p * 100}</text>
        </g>
      ))}
      <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} stroke="var(--text-3)" strokeDasharray="3 3" />
      {bins.filter((b) => b.n).map((b) => (
        <circle key={b.lo} cx={x(b.predicted)} cy={y(b.observed)} r={3 + 7 * Math.sqrt(b.n / max)} fill="var(--accent)" />
      ))}
    </svg>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <div className="card p-6">
      <div className="t-caption accent font-semibold">Step {n}</div>
      <div className="t-headline mt-1">{title}</div>
      <p className="t-caption mt-2" style={{ fontSize: 15, lineHeight: 1.5 }}>{children}</p>
    </div>
  )
}

export default function Accuracy() {
  const { data, error } = useAccuracy()
  if (!data) return <Loading error={error} />
  const ready = data.resolved >= MIN_FOR_CHART
  const skill = data.brier !== null && data.baselineBrier ? 1 - data.brier / data.baselineBrier : null

  return (
    <div className="wrap pt-14">
      <div className="t-hero">Accuracy</div>
      <p className="t-sub mt-1.5 max-w-2xl">Every edition is frozen when it’s published, and every forecast is scored against what actually happened.</p>

      <div className="grid gap-4 mt-8 md:grid-cols-[1.2fr_1fr]">
        <div className="card p-7">
          {ready ? (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div><div className="num-xl" style={{ fontSize: 40 }}>{data.resolved}</div><div className="t-caption mt-1">Calls resolved</div></div>
                <div><div className="num-xl" style={{ fontSize: 40 }}>{data.brier?.toFixed(3)}</div><div className="t-caption mt-1">Brier score</div></div>
                <div><div className="num-xl" style={{ fontSize: 40 }}>{skill !== null ? `${Math.round(skill * 100)}%` : '—'}</div><div className="t-caption mt-1">Better than base rate</div></div>
              </div>
              <p className="t-caption mt-6">
                The Brier score is the average squared gap between what we said and what happened: 0 is perfect, and always guessing the base rate scores {data.baselineBrier?.toFixed(3)}. On the chart, dots on the diagonal mean “70%” came true about 70% of the time.
              </p>
            </>
          ) : (
            <>
              <div className="t-title">Still calibrating</div>
              <p className="mt-3" style={{ fontSize: 19, lineHeight: 1.45 }}>
                {data.resolved} of the {MIN_FOR_CHART} resolved calls needed for a meaningful score.
                {data.nextResolution ? ` The first forecasts come due on ${longDate(data.nextResolution)}.` : ''}
              </p>
              <p className="t-caption mt-3">We won’t show a track record we haven’t earned.</p>
            </>
          )}
        </div>
        <div className="card p-7 grid place-items-center">
          {ready ? <Calibration bins={data.bins} /> : <span className="t-caption text-center">The calibration chart appears after {MIN_FOR_CHART} resolved calls.</span>}
        </div>
      </div>

      <div className="t-title mt-16">How the forecast works</div>
      <div className="grid gap-4 mt-6 md:grid-cols-3">
        <Step n={1} title="Gather">Every Monday, runway data, forecasters, shopper data and editors are read. Each relevant claim becomes a signal: which trend, which source, rising or declining, how strongly, when it’s expected to land, with a link.</Step>
        <Step n={2} title="Weigh">Signals are weighted by source type (measured data counts most), strength and freshness, with a six-month half-life. Outlets from the same group count as one voice, however many articles they run.</Step>
        <Step n={3} title="Forecast">A fixed formula turns signals into a curve. Lifecycle stage sets the starting odds, independent agreement moves them, and disagreement widens the range. Past two years, every forecast fades toward the base rate, because nobody can see that far.</Step>
      </div>
      <div className="grid gap-4 mt-4 md:grid-cols-2">
        <div className="card p-6">
          <div className="t-headline">What “mainstream” means</div>
          <p className="t-caption mt-2" style={{ fontSize: 15, lineHeight: 1.5 }}>In the new-in of at least three of Zara, H&M, Mango, COS and Uniqlo, and search interest at or above its two-year average. Each week every trend gets a yes or no, and every past forecast that falls due is scored against it.</p>
        </div>
        <div className="card p-6">
          <div className="t-headline">What we don’t claim</div>
          <p className="t-caption mt-2" style={{ fontSize: 15, lineHeight: 1.5 }}>We don’t have access to paywalled platforms or private sales data. The AI reads and summarises; it never sets a probability. The numbers come from a formula that’s public in the code.</p>
        </div>
      </div>
    </div>
  )
}
