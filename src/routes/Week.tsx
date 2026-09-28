import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { EditionTrend } from '../data/schema'
import { Loading } from '../components/Loading'
import { useEdition } from '../lib/data'
import { longDate, pct, signedPts } from '../lib/format'
import { useViewParams } from '../lib/params'

function Row({ t, search, right }: { t: EditionTrend; search: string; right: ReactNode }) {
  return (
    <Link to={`/trend/${t.id}?${search}`} className="flex items-center gap-3 py-3 rule no-underline hover:bg-[var(--card)]">
      <span className="swatch-dot" style={{ background: t.swatch }} />
      <span className="display flex-1" style={{ fontSize: 22 }}>{t.name}</span>
      <span className="mono text-sm">{right}</span>
    </Link>
  )
}

export default function Week() {
  const { params, set, search } = useViewParams()
  const { edition, index, error } = useEdition(params.e)
  if (!edition || !index) return <Loading error={error} />

  const at6 = (t: EditionTrend) => t.forecast.curve[6].p
  const d6 = (t: EditionTrend) => t.delta?.['6'] ?? 0
  const first = edition.trends.every((t) => !t.delta)
  const movers = [...edition.trends].filter((t) => t.delta).sort((a, b) => Math.abs(d6(b)) - Math.abs(d6(a))).filter((t) => Math.abs(d6(t)) >= 0.01).slice(0, 8)
  const fresh = edition.trends.filter((t) => t.isNew)
  const top = [...edition.trends].sort((a, b) => at6(b) - at6(a)).slice(0, 6)
  const fading = edition.trends.filter((t) => t.stage === 'fading').sort((a, b) => at6(a) - at6(b))
  const contested = [...edition.trends].filter((t) => t.forecast.consensus.total > 1).sort((a, b) => a.forecast.consensus.agreement - b.forecast.consensus.agreement).slice(0, 3)
  const signals = edition.trends.reduce((a, t) => a + t.signals.length, 0)

  return (
    <div className="wrap pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">This week</div>
          <h1 className="display" style={{ fontSize: 'clamp(40px, 7vw, 72px)' }}>{longDate(edition.date)}</h1>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="muted">Edition</span>
          <select className="select" value={edition.id} onChange={(e) => set({ e: e.target.value === index.latest ? null : e.target.value })}>
            {[...index.editions].reverse().map((e) => (
              <option key={e.id} value={e.id}>{e.id}{e.id === index.latest ? ' (latest)' : ''}</option>
            ))}
          </select>
        </label>
      </div>

      <p className="lede mt-6 max-w-3xl">
        {first
          ? `The first edition: ${edition.trends.length} trends built from ${signals} cited signals. From next week this page tracks what moved.`
          : `${edition.trends.length} trends, ${signals} signals. ${fresh.length} new, ${movers.length} moved by a point or more, ${edition.dropped.length} dropped.`}
      </p>

      <div className="grid gap-10 md:grid-cols-2 mt-10">
        {!first && (
          <section>
            <div className="eyebrow rule-strong pt-3 mb-1">Biggest movers · 6-month outlook</div>
            {movers.length ? movers.map((t) => (
              <Row key={t.id} t={t} search={search} right={<span className={d6(t) > 0 ? 'delta-up' : 'delta-down'}>{signedPts(d6(t))} pts</span>} />
            )) : <p className="py-3 muted">A quiet week — nothing moved by more than a point.</p>}
          </section>
        )}
        {fresh.length > 0 && (
          <section>
            <div className="eyebrow rule-strong pt-3 mb-1">New on the map</div>
            {fresh.map((t) => <Row key={t.id} t={t} search={search} right={pct(at6(t))} />)}
          </section>
        )}
        <section>
          <div className="eyebrow rule-strong pt-3 mb-1">Strongest calls · 6 months out</div>
          {top.map((t) => <Row key={t.id} t={t} search={search} right={pct(at6(t))} />)}
        </section>
        <section>
          <div className="eyebrow rule-strong pt-3 mb-1">Most contested</div>
          {contested.map((t) => (
            <Row key={t.id} t={t} search={search} right={`${t.forecast.consensus.agreeing}/${t.forecast.consensus.total} agree`} />
          ))}
        </section>
        {fading.length > 0 && (
          <section>
            <div className="eyebrow rule-strong pt-3 mb-1">On the way out</div>
            {fading.map((t) => <Row key={t.id} t={t} search={search} right={pct(at6(t))} />)}
          </section>
        )}
        {edition.dropped.length > 0 && (
          <section>
            <div className="eyebrow rule-strong pt-3 mb-1">Dropped this week</div>
            {edition.dropped.map((t) => <div key={t.id} className="py-3 rule display" style={{ fontSize: 22 }}>{t.name}</div>)}
          </section>
        )}
      </div>
    </div>
  )
}
