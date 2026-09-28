import { Loading } from '../components/Loading'
import { useEdition } from '../lib/data'
import { TIER_LABEL, pct } from '../lib/format'
import { useViewParams } from '../lib/params'
import { TIERS } from '../data/schema'

const TIER_NOTE = {
  data: 'Measured behaviour — searches, sales, runway counts. Weighted highest.',
  forecaster: 'Professional forecasting built on proprietary data.',
  retail: 'What buyers and retailers are actually ranging.',
  editorial: 'Expert eyes on the runway. Useful for timing, easily swayed by spectacle.',
}

export default function Sources() {
  const { params } = useViewParams()
  const { edition, error } = useEdition(params.e)
  if (!edition) return <Loading error={error} />

  const cited = new Map<string, number>()
  for (const t of edition.trends) for (const s of t.signals) cited.set(s.sourceId, (cited.get(s.sourceId) ?? 0) + 1)

  return (
    <div className="wrap pt-8">
      <div className="eyebrow">Sources</div>
      <h1 className="display" style={{ fontSize: 'clamp(40px, 7vw, 72px)' }}>Who we listen to</h1>
      <p className="lede mt-4 max-w-3xl">
        Each source starts with a weight for its type. Once it has five resolved calls, the weight moves with its track record, between 0.6× and 1.4×.
        Outlets owned by the same group count as one voice.
      </p>

      {TIERS.map((tier) => {
        const list = edition.sources.filter((s) => s.tier === tier).sort((a, b) => (cited.get(b.id) ?? 0) - (cited.get(a.id) ?? 0))
        if (!list.length) return null
        return (
          <section key={tier} className="mt-10">
            <div className="flex items-baseline justify-between gap-4 rule-strong pt-3">
              <h2 className="display" style={{ fontSize: 32 }}>{TIER_LABEL[tier]}</h2>
              <span className="text-xs muted hidden sm:block">{TIER_NOTE[tier]}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="table text-sm min-w-[560px]">
                <thead>
                  <tr><th>Source</th><th>What it measures</th><th className="text-right">Weight</th><th className="text-right">Cited</th><th className="text-right">Track record</th></tr>
                </thead>
                <tbody>
                  {list.map((s) => (
                    <tr key={s.id}>
                      <td className="font-medium"><a href={s.url} target="_blank" rel="noreferrer" className="no-underline hover:underline">{s.name}</a></td>
                      <td style={{ color: 'var(--ink-2)' }}>{s.measures}</td>
                      <td className="mono text-right">{s.weight.toFixed(2)}</td>
                      <td className="mono text-right">{cited.get(s.id) ?? 0}</td>
                      <td className="mono text-right whitespace-nowrap">{s.hitRate === null ? <span className="muted">pending</span> : `${pct(s.hitRate)} of ${s.resolved}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )
      })}

      <p className="text-sm muted mt-10 max-w-3xl">
        Not used directly: paywalled products (WGSN's core platform, EDITED, full Tagwalk reports), for which we only use their public releases,
        plus sites that block automated reading. Every signal links to its source.
      </p>
    </div>
  )
}
