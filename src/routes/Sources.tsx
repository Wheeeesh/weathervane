import { Loading } from '../components/Loading'
import { useEdition } from '../lib/data'
import { TIER_LABEL, pct } from '../lib/format'
import { useViewParams } from '../lib/params'
import { TIERS } from '../data/schema'

const TIER_NOTE = {
  data: 'Measured behaviour: searches, sales, runway counts. Weighted highest.',
  forecaster: 'Professional forecasting built on proprietary data.',
  retail: 'What buyers and retailers are actually stocking.',
  editorial: 'Expert eyes on the runway. Good for timing, easily swayed by spectacle.',
}

export default function Sources() {
  const { params } = useViewParams()
  const { edition, error } = useEdition(params.e)
  if (!edition) return <Loading error={error} />

  const cited = new Map<string, number>()
  for (const t of edition.trends) for (const s of t.signals) cited.set(s.sourceId, (cited.get(s.sourceId) ?? 0) + 1)

  return (
    <div className="wrap pt-14">
      <div className="t-hero">Sources</div>
      <p className="t-sub mt-1.5 max-w-2xl">
        Every source starts with a weight for its type. After five resolved calls, its weight moves with its track record, from 0.6× to 1.4×. Outlets owned by the same group count as one voice.
      </p>

      <div className="space-y-10 mt-10">
        {TIERS.map((tier) => {
          const list = edition.sources.filter((s) => s.tier === tier).sort((a, b) => (cited.get(b.id) ?? 0) - (cited.get(a.id) ?? 0))
          if (!list.length) return null
          return (
            <section key={tier}>
              <div className="t-section">{TIER_LABEL[tier]} — {TIER_NOTE[tier]}</div>
              <div className="group">
                {list.map((s) => (
                  <a key={s.id} href={s.url} target="_blank" rel="noreferrer" className="row" style={{ alignItems: 'flex-start' }}>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium" style={{ fontSize: 15 }}>{s.name}</div>
                      <div className="t-caption">{s.measures}</div>
                    </div>
                    <div className="text-right t-caption num shrink-0">
                      <div style={{ color: 'var(--text)' }}>{s.weight.toFixed(2)}</div>
                      <div>{cited.get(s.id) ?? 0} cited</div>
                      <div>{s.hitRate === null ? 'No record yet' : `${pct(s.hitRate)} of ${s.resolved}`}</div>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )
        })}
      </div>

      <p className="t-footnote mt-8 max-w-2xl">
        Paywalled products (WGSN’s platform, EDITED, full Tagwalk reports) are used only through what they publish openly. Sites that block automated reading aren’t used. Every signal links to its source.
      </p>
    </div>
  )
}
