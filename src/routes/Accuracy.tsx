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
  return (
    <svg viewBox={`0 0 ${s} ${s}`} width="100%" style={{ maxWidth: 360 }} role="img" aria-label="Calibration: predicted versus observed frequency">
      {[0, 0.5, 1].map((p) => (
        <g key={p}>
          <line x1={x(0)} x2={x(1)} y1={y(p)} y2={y(p)} stroke="var(--rule)" />
          <text x={x(0) - 6} y={y(p) + 3} fontSize={9} textAnchor="end" fontFamily="var(--font-mono)" fill="var(--muted)">{p * 100}</text>
          <text x={x(p)} y={y(0) + 14} fontSize={9} textAnchor="middle" fontFamily="var(--font-mono)" fill="var(--muted)">{p * 100}</text>
        </g>
      ))}
      <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} stroke="var(--rule-strong)" strokeDasharray="3 3" />
      {bins.filter((b) => b.n).map((b) => (
        <circle key={b.lo} cx={x(b.predicted)} cy={y(b.observed)} r={3 + 7 * Math.sqrt(b.n / max)} fill="var(--accent)" opacity={0.85} />
      ))}
      <text x={x(0.5)} y={s - 4} fontSize={9} textAnchor="middle" fontFamily="var(--font-mono)" fill="var(--muted)">WE SAID (%)</text>
    </svg>
  )
}

export default function Accuracy() {
  const { data, error } = useAccuracy()
  if (!data) return <Loading error={error} />
  const ready = data.resolved >= MIN_FOR_CHART
  const skill = data.brier !== null && data.baselineBrier ? 1 - data.brier / data.baselineBrier : null

  return (
    <div className="wrap pt-8">
      <div className="eyebrow">Accuracy & method</div>
      <h1 className="display" style={{ fontSize: 'clamp(40px, 7vw, 72px)' }}>Are we any good?</h1>

      <section className="grid gap-10 md:grid-cols-[1fr_1fr] mt-8">
        <div>
          {ready ? (
            <>
              <div className="grid grid-cols-3 gap-4 rule-strong pt-4">
                <div><div className="display" style={{ fontSize: 48 }}>{data.resolved}</div><div className="eyebrow">Calls resolved</div></div>
                <div><div className="display" style={{ fontSize: 48 }}>{data.brier?.toFixed(3)}</div><div className="eyebrow">Brier score</div></div>
                <div><div className="display" style={{ fontSize: 48 }}>{skill !== null ? `${Math.round(skill * 100)}%` : '—'}</div><div className="eyebrow">Better than base rate</div></div>
              </div>
              <p className="text-sm muted mt-4">
                Brier score: average squared gap between what we said and what happened. 0 is perfect; always saying the base rate scores {data.baselineBrier?.toFixed(3)}.
                On the chart, dots on the diagonal mean “70%” really happened about 70% of the time.
              </p>
            </>
          ) : (
            <div className="rule-strong pt-4">
              <div className="display" style={{ fontSize: 40 }}>Still calibrating.</div>
              <p className="lede mt-3">
                {data.resolved} of the {MIN_FOR_CHART} resolved calls needed for a meaningful score.
                {data.nextResolution ? ` The first forecasts come due on ${longDate(data.nextResolution)}.` : ''}
              </p>
              <p className="text-sm muted mt-3">We won't show a track record we haven't earned. Every edition is frozen the day it's published, so this score can't be quietly rewritten.</p>
            </div>
          )}
        </div>
        <div className="flex justify-center items-start">
          {ready ? <Calibration bins={data.bins} /> : (
            <div className="w-full max-w-[360px] aspect-square grid place-items-center" style={{ border: '1px dashed var(--rule-strong)' }}>
              <span className="mono text-xs muted text-center px-6">Calibration chart appears after {MIN_FOR_CHART} resolved calls</span>
            </div>
          )}
        </div>
      </section>

      <section className="mt-16 rule-strong pt-4 prose">
        <h2 className="display" style={{ fontSize: 40 }}>How the forecast works</h2>
        <div className="grid gap-8 md:grid-cols-3 mt-6">
          <div>
            <div className="eyebrow mb-2">1 · Gather</div>
            <p>Every Monday we read the week's output from runway data, forecasters, shopper data and editors. Each relevant claim becomes a <strong>signal</strong>: which trend, which source, rising or declining, how strongly, and when the source expects it to land, with a link.</p>
          </div>
          <div>
            <div className="eyebrow mb-2">2 · Weigh</div>
            <p>Signals are weighted by source type (measured data counts most), strength and freshness, with a six-month half-life. Outlets from the same group count as one voice, however many articles they run.</p>
          </div>
          <div>
            <div className="eyebrow mb-2">3 · Forecast</div>
            <p>A fixed formula turns the signals into a curve: when the trend peaks (its lifecycle stage blended with the timing each source implies) and how likely it is to go mainstream at all (more independent agreement means a higher ceiling). When sources disagree on timing, the band widens and the number is pulled toward a 20% base rate.</p>
          </div>
        </div>
        <div className="grid gap-8 md:grid-cols-2 mt-8">
          <div>
            <div className="eyebrow mb-2">What “mainstream” means</div>
            <p>A trend counts as mainstream on a given date when it's in the new-in of at least three of Zara, H&amp;M, Mango, COS and Uniqlo, <em>and</em> search interest is at or above its two-year average. Each week every trend gets a yes/no against that test, and every past forecast that falls due is scored against it.</p>
          </div>
          <div>
            <div className="eyebrow mb-2">What we don't claim</div>
            <p>We're not inside WGSN's paywall or anyone's sales data. Numbers from paid platforms reach us only through what they publish openly. The AI reads and summarises; it never sets a probability. Those come from the formula, which is public in the code.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
