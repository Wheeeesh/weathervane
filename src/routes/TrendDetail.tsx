import { Link, useParams } from 'react-router-dom'
import { ConsensusMeter } from '../components/ConsensusMeter'
import { Loading } from '../components/Loading'
import { ProbabilityCurve } from '../components/ProbabilityCurve'
import { useEdition, useHistory } from '../lib/data'
import {
  CATEGORY_LABEL, MARKET_LABEL, REGION_LABEL, SEGMENT_LABEL, STAGE_LABEL, STANCE_LABEL, TIER_LABEL,
  horizonDate, horizonName, longDate, monthLabel, pct, season, signedPts, verdict,
} from '../lib/format'
import { nearestHorizon, useViewParams } from '../lib/params'
import { HORIZONS } from '../lib/scoring'

export default function TrendDetail() {
  const { id } = useParams()
  const { params, set, search } = useViewParams()
  const { edition, error } = useEdition(params.e)
  const history = useHistory()

  if (!edition) return <Loading error={error} />
  const trend = edition.trends.find((t) => t.id === id)
  if (!trend) {
    return (
      <div className="wrap py-20">
        <div className="display" style={{ fontSize: 36 }}>This trend isn't in this edition.</div>
        <Link to={`/?${search}`} className="btn mt-5 inline-block no-underline">Back to the forecast</Link>
      </div>
    )
  }

  const src = new Map(edition.sources.map((s) => [s.id, s]))
  const f = trend.forecast
  const pt = f.curve[params.m]
  const at = horizonDate(edition.date, params.m)
  const d = trend.delta?.[String(nearestHorizon(params.m))]
  const past = history.data?.[trend.id] ?? []
  const peakAt = horizonDate(edition.date, f.peak.m)

  return (
    <article className="fade-in">
      <div style={{ height: 10, background: trend.swatch }} />
      <div className="wrap pt-6">
        <Link to={`/?${search}`} className="mono text-xs muted no-underline hover:underline">← All trends</Link>

        <header className="grid gap-6 md:grid-cols-[1fr_auto] mt-4 items-end">
          <div>
            <div className="flex gap-2 items-center flex-wrap mb-3">
              <span className="tag">{CATEGORY_LABEL[trend.category]}</span>
              <span className="tag">·</span>
              <span className="tag">{SEGMENT_LABEL[trend.segment]}</span>
              <span className={`stage stage-${trend.stage} ml-1`}>{STAGE_LABEL[trend.stage]}</span>
            </div>
            <h1 className="display" style={{ fontSize: 'clamp(44px, 8vw, 88px)' }}>{trend.name}</h1>
            <p className="mt-3 text-lg max-w-2xl" style={{ color: 'var(--ink-2)' }}>{trend.definition}</p>
          </div>
          <div className="md:text-right">
            <div className="eyebrow">{horizonName(params.m)} · {monthLabel(at)} {season(at)}</div>
            <div className="display" style={{ fontSize: 'clamp(72px, 12vw, 120px)', lineHeight: 0.85 }}>
              {Math.round(pt.p * 100)}<span style={{ fontSize: '0.4em' }}>%</span>
            </div>
            <div className="mono text-xs mt-2">
              {verdict(pt.p)} to be mainstream · range {pct(pt.lo)}–{pct(pt.hi)}
              {d !== undefined && <span className={d > 0.005 ? 'delta-up' : d < -0.005 ? 'delta-down' : 'muted'}> · {signedPts(d)} pts vs last week</span>}
            </div>
          </div>
        </header>

        <section className="rule-strong mt-8 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <div className="chip-row">
              {HORIZONS.map((h) => (
                <button key={h} className={`chip ${params.m === h ? 'on' : ''}`} onClick={() => set({ m: h })}>{h === 0 ? 'Now' : `${h}M`}</button>
              ))}
            </div>
            <div className="text-xs muted">
              Most likely peak: <strong style={{ color: 'var(--ink)' }}>{f.peak.m === 0 ? 'now' : `${monthLabel(peakAt)} (${season(peakAt)})`}</strong> at {pct(f.peak.p)}
            </div>
          </div>
          <ProbabilityCurve forecast={f} m={params.m} onChange={(m) => set({ m })} editionDate={edition.date} color={trend.swatch} />
          <p className="text-xs muted mt-1">Drag across the chart to move through time. Shaded band = the plausible range given how much the sources agree.</p>
        </section>

        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr] mt-10">
          <section>
            <div className="eyebrow mb-3">Why</div>
            <p className="lede">{trend.reasoning}</p>
            <div className="mt-6 p-4" style={{ borderLeft: '3px solid var(--accent)', background: 'var(--card)' }}>
              <div className="eyebrow mb-1">What would change our mind</div>
              <p>{trend.wouldChange}</p>
            </div>
          </section>

          <aside className="space-y-6">
            <div>
              <div className="eyebrow mb-3">Consensus</div>
              <ConsensusMeter consensus={f.consensus} />
              <table className="table mt-3 text-sm">
                <thead><tr><th>Source family</th><th>Says</th><th>Peak</th></tr></thead>
                <tbody>
                  {f.consensus.families.map((fam) => {
                    const names = fam.sources.map((s) => src.get(s)?.name ?? s).join(', ')
                    return (
                      <tr key={fam.family}>
                        <td>
                          <div>{names}</div>
                          <div className="tag mt-0.5">{TIER_LABEL[src.get(fam.sources[0])?.tier ?? 'editorial']} · weight {fam.weight.toFixed(2)}</div>
                        </td>
                        <td>{STANCE_LABEL[fam.stance]}</td>
                        <td className="mono text-xs whitespace-nowrap">
                          {season(horizonDate(edition.date, Math.round(fam.centre)))}
                          {!fam.agrees && <div style={{ color: 'var(--accent)' }}>disagrees</div>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div>
              <div className="eyebrow mb-2">How it resolves</div>
              <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
                Counted as mainstream when it's stocked in the new-in of at least three of Zara, H&M, Mango, COS and Uniqlo <em>and</em> search interest for
                “<a href={`https://trends.google.com/trends/explore?date=today%205-y&q=${encodeURIComponent(trend.searchTerm)}`} target="_blank" rel="noreferrer">{trend.searchTerm}</a>” sits at or above its two-year average.
              </p>
            </div>
            <div>
              <div className="eyebrow mb-2">Week by week · 6-month outlook</div>
              {past.length > 1 ? (
                <div className="flex items-end gap-1 h-12">
                  {past.map((h) => (
                    <div key={h.edition} title={`${h.edition}: ${pct(h.p[3])}`} style={{ flex: 1, height: `${Math.max(4, h.p[3] * 100)}%`, background: h.edition === edition.id ? 'var(--accent)' : 'var(--ink)' }} />
                  ))}
                </div>
              ) : (
                <p className="text-sm muted">First edition — the weekly history starts here.</p>
              )}
            </div>
          </aside>
        </div>

        <section className="mt-12">
          <div className="flex items-baseline justify-between rule-strong pt-4 mb-2">
            <div className="eyebrow">Evidence · {trend.signals.length} signal{trend.signals.length === 1 ? '' : 's'}</div>
            <div className="text-xs muted hidden sm:block">Weight = source weight × strength × freshness</div>
          </div>
          <ol>
            {trend.signals.map((s) => {
              const source = src.get(s.sourceId)
              return (
                <li key={s.id} className="grid gap-1 sm:grid-cols-[180px_1fr_auto] sm:gap-6 py-4 rule">
                  <div>
                    <div className="font-medium">{source?.name}</div>
                    <div className="tag mt-0.5">{source ? TIER_LABEL[source.tier] : ''}</div>
                  </div>
                  <div>
                    <p>{s.summary}</p>
                    <a href={s.url} target="_blank" rel="noreferrer" className="mono text-xs muted break-all">
                      {new URL(s.url).hostname.replace('www.', '')}{s.via ? ` · via ${s.via}` : ''} ↗
                    </a>
                  </div>
                  <div className="mono text-xs sm:text-right whitespace-nowrap">
                    <div className={s.stance === 'declining' ? 'delta-down' : 'delta-up'}>{STANCE_LABEL[s.stance]}{s.target ? ` → ${season(s.target + '-15')}` : ''}</div>
                    <div className="muted">{s.dateApprox ? '~' : ''}{longDate(s.date)}</div>
                    <div className="muted">w {s.weight.toFixed(2)}</div>
                  </div>
                </li>
              )
            })}
          </ol>
        </section>

        <p className="text-xs muted mt-6">
          Markets: {trend.markets.map((m) => MARKET_LABEL[m]).join(', ')} · Regions: {trend.regions.map((r) => REGION_LABEL[r]).join(', ')} · Tracked since {trend.addedIn}
        </p>
      </div>
    </article>
  )
}
