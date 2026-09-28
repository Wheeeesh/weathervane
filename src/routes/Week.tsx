import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { EditionTrend } from '../data/schema'
import { Loading } from '../components/Loading'
import { useEdition } from '../lib/data'
import { longDate, pct, signedPts } from '../lib/format'
import { useViewParams } from '../lib/params'

function Row({ t, search, right }: { t: EditionTrend; search: string; right: ReactNode }) {
  return (
    <Link to={`/trend/${t.id}?${search}`} className="row">
      <span className="dot" style={{ background: t.swatch }} />
      <span className="flex-1 min-w-0 truncate">{t.name}</span>
      <span className="t-caption num">{right}</span>
      <span className="chev" />
    </Link>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <div className="t-section">{title}</div>
      <div className="group">{children}</div>
    </section>
  )
}

export default function Week() {
  const { params, set, search } = useViewParams()
  const { edition, index, error } = useEdition(params.e)
  if (!edition || !index) return <Loading error={error} />

  const at6 = (t: EditionTrend) => t.forecast.curve[6].p
  const d6 = (t: EditionTrend) => t.delta?.['6'] ?? 0
  const first = edition.trends.every((t) => !t.delta)
  const movers = [...edition.trends].filter((t) => t.delta && Math.abs(d6(t)) >= 0.01).sort((a, b) => Math.abs(d6(b)) - Math.abs(d6(a))).slice(0, 8)
  const fresh = edition.trends.filter((t) => t.isNew)
  const top = [...edition.trends].sort((a, b) => at6(b) - at6(a)).slice(0, 6)
  const fading = edition.trends.filter((t) => t.stage === 'fading').sort((a, b) => at6(a) - at6(b))
  const contested = [...edition.trends].filter((t) => t.forecast.consensus.total > 1).sort((a, b) => a.forecast.consensus.agreement - b.forecast.consensus.agreement).slice(0, 3)
  const signals = edition.trends.reduce((a, t) => a + t.signals.length, 0)

  return (
    <div className="wrap pt-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="t-hero">This Week</div>
          <div className="t-sub mt-1.5">{longDate(edition.date)}</div>
        </div>
        <select className="select" value={edition.id} onChange={(e) => set({ e: e.target.value === index.latest ? null : e.target.value })} aria-label="Edition">
          {[...index.editions].reverse().map((e) => (
            <option key={e.id} value={e.id}>{e.id}{e.id === index.latest ? ' (latest)' : ''}</option>
          ))}
        </select>
      </div>

      <div className="card p-6 mt-8 max-w-3xl">
        <p style={{ fontSize: 19, lineHeight: 1.45 }}>
          {first
            ? `The first edition: ${edition.trends.length} trends built from ${signals} cited signals. From next week, this page shows what moved.`
            : `${edition.trends.length} trends from ${signals} signals. ${fresh.length} new, ${movers.length} moved by a point or more, ${edition.dropped.length} dropped.`}
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 mt-10">
        {!first && (
          <Section title="Biggest movers · 6 months out">
            {movers.length ? movers.map((t) => <Row key={t.id} t={t} search={search} right={<span className={d6(t) > 0 ? 'up' : 'down'}>{signedPts(d6(t))} pts</span>} />)
              : <div className="row t-caption">A quiet week. Nothing moved by more than a point.</div>}
          </Section>
        )}
        {fresh.length > 0 && <Section title="New">{fresh.map((t) => <Row key={t.id} t={t} search={search} right={pct(at6(t))} />)}</Section>}
        <Section title="Strongest calls · 6 months out">{top.map((t) => <Row key={t.id} t={t} search={search} right={pct(at6(t))} />)}</Section>
        <Section title="Most contested">
          {contested.map((t) => <Row key={t.id} t={t} search={search} right={`${t.forecast.consensus.agreeing} of ${t.forecast.consensus.total} agree`} />)}
        </Section>
        {fading.length > 0 && <Section title="On the way out">{fading.map((t) => <Row key={t.id} t={t} search={search} right={pct(at6(t))} />)}</Section>}
        {edition.dropped.length > 0 && (
          <Section title="Dropped">{edition.dropped.map((t) => <div key={t.id} className="row">{t.name}</div>)}</Section>
        )}
      </div>
    </div>
  )
}
