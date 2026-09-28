import { Link, useParams } from 'react-router-dom'
import { ConsensusMeter } from '../components/ConsensusMeter'
import { PRESETS } from '../components/HorizonSlider'
import { Loading } from '../components/Loading'
import { ProbabilityCurve } from '../components/ProbabilityCurve'
import { useEdition, useHistory } from '../lib/data'
import {
  ADOPTER_HINT, ADOPTER_LABEL, CATEGORY_LABEL, MARKET_LABEL, leadLabel, REGION_LABEL, SEGMENT_LABEL, STAGE_LABEL, STANCE_LABEL, TIER_LABEL,
  horizonDate, horizonName, horizonShort, longDate, monthLong, pct, range, season, signedPts, verdict,
} from '../lib/format'
import { nearestHorizon, useViewParams } from '../lib/params'
import { LONG_RANGE, adopterAt, coverageAt } from '../lib/scoring'

export default function TrendDetail() {
  const { id } = useParams()
  const { params, set, search } = useViewParams()
  const { edition, error } = useEdition(params.e)
  const history = useHistory()

  if (!edition) return <Loading error={error} />
  const trend = edition.trends.find((t) => t.id === id)
  if (!trend) {
    return (
      <div className="wrap py-24 text-center">
        <div className="t-headline">This trend isn’t in this edition.</div>
        <Link to={`/?${search}`} className="btn link mt-3 inline-block">Back to Forecast</Link>
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
  const phase = adopterAt(trend.stage, f.centre, params.m)
  const coverage = coverageAt(trend.signals, edition.sources, params.m)

  return (
    <article className="wrap pt-8 fade-in">
      <Link to={`/?${search}`} className="t-caption accent">‹ Forecast</Link>

      <header className="mt-5">
        <div className="flex items-center gap-2 flex-wrap t-caption">
          <span className="dot" style={{ background: trend.swatch }} />
          <span>{CATEGORY_LABEL[trend.category]} · {SEGMENT_LABEL[trend.segment]}</span>
          <span className={`stage stage-${trend.stage}`}>{STAGE_LABEL[trend.stage]}</span>
        </div>
        <h1 className="t-hero mt-2">{trend.name}</h1>
        <p className="t-sub mt-2 max-w-2xl" style={{ fontSize: 19 }}>{trend.definition}</p>
      </header>

      <div className="grid gap-4 mt-8 md:grid-cols-[280px_1fr]">
        <section className="card p-6 flex flex-col">
          <div className="t-caption">{monthLong(at)} · {season(at)}</div>
          <div className="num-xl mt-2" style={{ fontSize: 72 }}>{Math.round(pt.p * 100)}<small>%</small></div>
          <div className="t-body font-medium mt-2">{verdict(pt.p)} to be mainstream</div>
          <div className="t-caption mt-0.5">Range {range(pt.lo, pt.hi)} · {horizonName(params.m)}</div>
          {d !== undefined && <div className={`t-caption mt-0.5 num ${d > 0.005 ? 'up' : d < -0.005 ? 'down' : ''}`}>{signedPts(d)} pts since last week</div>}
          {params.m > LONG_RANGE && <div className="mt-3"><span className="badge-long">Long range · low confidence</span></div>}
          <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--sep)' }}>
            <div className="t-caption">Who’d be wearing it, if it lands</div>
            <div className="mt-1"><span className={`stage adopt-${phase}`}>{ADOPTER_LABEL[phase]}</span></div>
            <div className="t-footnote mt-1">{ADOPTER_HINT[phase]}</div>
          </div>
          <div className="mt-4">
            <div className="t-caption">Evidence at this distance</div>
            <div className={`mt-0.5 font-medium ${coverage < 2 ? 'down' : ''}`} style={{ fontSize: 15 }}>
              {coverage === 0 ? 'No source can see this far' : `${coverage} source group${coverage === 1 ? '' : 's'}`}
            </div>
            {coverage < 2 && <div className="t-footnote">Treat this number as a rough prior, not a forecast.</div>}
          </div>
          <div className="mt-auto pt-5 t-caption">
            Most likely peak: <span style={{ color: 'var(--text)' }}>{f.peak.m === 0 ? 'now' : `${monthLong(peakAt)} (${season(peakAt)})`}</span> at {pct(f.peak.p)}
          </div>
        </section>

        <section className="card p-5 min-w-0">
          <div className="seg mb-4">
            {PRESETS.map((h) => (
              <button key={h} className={params.m === h ? 'on' : ''} onClick={() => set({ m: h })}>{horizonShort(h)}</button>
            ))}
          </div>
          <ProbabilityCurve forecast={f} m={params.m} onChange={(m) => set({ m })} editionDate={edition.date} />
          <p className="t-footnote mt-2">Tap or drag the chart to move through time. The shaded band is the plausible range given how much the sources agree.</p>
        </section>
      </div>

      <div className="grid gap-8 mt-10 md:grid-cols-[1.35fr_1fr]">
        <div className="space-y-8">
          <section>
            <div className="t-section">Why</div>
            <div className="card p-6">
              <p className="t-body" style={{ fontSize: 19, lineHeight: 1.45 }}>{trend.reasoning}</p>
            </div>
          </section>
          <section>
            <div className="t-section">What would change our mind</div>
            <div className="card p-6"><p>{trend.wouldChange}</p></div>
          </section>
        </div>

        <aside className="space-y-8">
          <section>
            <div className="t-section">Consensus</div>
            <div className="group">
              <div className="row"><ConsensusMeter consensus={f.consensus} /></div>
              {f.consensus.families.map((fam) => (
                <div key={fam.family} className="row">
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{fam.sources.map((s) => src.get(s)?.name ?? s).join(', ')}</div>
                    <div className="t-footnote">{TIER_LABEL[src.get(fam.sources[0])?.tier ?? 'editorial']} · {leadLabel(src.get(fam.sources[0])?.lead ?? [0, 12])} · weight {fam.weight.toFixed(2)}</div>
                  </div>
                  <div className="text-right t-caption">
                    <div style={{ color: 'var(--text)' }}>{STANCE_LABEL[fam.stance]}</div>
                    <div>{fam.agrees ? `Peak ${season(horizonDate(edition.date, Math.round(fam.centre)))}` : <span className="down">Disagrees</span>}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="t-section">How it resolves</div>
            <div className="group p-4 t-caption" style={{ lineHeight: 1.5 }}>
              Counted as mainstream when it’s in the new-in of at least three of Zara, H&M, Mango, COS and Uniqlo, and search interest for{' '}
              <a className="accent" href={`https://trends.google.com/trends/explore?date=today%205-y&q=${encodeURIComponent(trend.searchTerm)}`} target="_blank" rel="noreferrer">“{trend.searchTerm}”</a>{' '}
              is at or above its two-year average.
            </div>
          </section>

          <section>
            <div className="t-section">6-month outlook, week by week</div>
            <div className="group p-4">
              {past.length > 1 ? (
                <div className="flex items-end gap-1 h-12">
                  {past.map((h) => (
                    <div key={h.edition} title={`${h.edition}: ${pct(h.p[3])}`} style={{ flex: 1, borderRadius: 3, height: `${Math.max(6, h.p[3] * 100)}%`, background: h.edition === edition.id ? 'var(--accent)' : 'var(--fill)' }} />
                  ))}
                </div>
              ) : (
                <p className="t-caption">First edition. The weekly history starts here.</p>
              )}
            </div>
          </section>
        </aside>
      </div>

      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <div className="t-section">Evidence · {trend.signals.length} signal{trend.signals.length === 1 ? '' : 's'}</div>
          <div className="t-footnote mr-4 hidden sm:block">Weight = source × strength × freshness</div>
        </div>
        <div className="group">
          {trend.signals.map((s) => {
            const source = src.get(s.sourceId)
            return (
              <a key={s.id} href={s.url} target="_blank" rel="noreferrer" className="row" style={{ alignItems: 'flex-start', paddingTop: 14, paddingBottom: 14 }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    {source && <span className={`q q-${source.quality}`} title={source.quality === 'A' ? 'Grade A: measured data or published method' : 'Grade B: established trade or editorial authority'}>{source.quality}</span>}
                    <span className="font-semibold" style={{ fontSize: 15 }}>{source?.name}</span>
                    <span className="t-footnote">{source ? TIER_LABEL[source.tier] : ''}{s.via ? ` · via ${s.via}` : ''}</span>
                  </div>
                  <p className="mt-1" style={{ fontSize: 15 }}>{s.summary}</p>
                  <div className="t-footnote mt-1 num">
                    <span className={s.stance === 'declining' ? 'down' : 'accent'}>{STANCE_LABEL[s.stance]}{s.target ? ` → ${season(s.target + '-15')}` : ''}</span>
                    {' · '}{s.dateApprox ? '~' : ''}{longDate(s.date)} · weight {s.weight.toFixed(2)} · {new URL(s.url).hostname.replace('www.', '')}
                  </div>
                </div>
                <span className="chev mt-2" />
              </a>
            )
          })}
        </div>
      </section>

      <p className="t-footnote mt-6">
        Markets: {trend.markets.map((m) => MARKET_LABEL[m]).join(', ')} · Regions: {trend.regions.map((r) => REGION_LABEL[r]).join(', ')} · Tracked since {trend.addedIn}
      </p>
    </article>
  )
}
