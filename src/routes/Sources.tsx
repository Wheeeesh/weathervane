import { Loading } from '../components/Loading'
import { useEdition } from '../lib/data'
import { TIER_LABEL, leadLabel, pct } from '../lib/format'
import { useViewParams } from '../lib/params'

/** The source ladder: which sources can see how far ahead, and why. */
const BANDS: { title: string; lo: number; hi: number; why: string }[] = [
  { title: 'Now to 3 months', lo: 0, hi: 3, why: 'What people are searching, buying and reselling right now.' },
  { title: '3 to 12 months', lo: 3, hi: 12, why: 'Runway to store takes 6–9 months, and buyers are already placing orders.' },
  { title: '1 to 2 years', lo: 12, hi: 24, why: 'The supply chain commits early: fabric and yarn fairs about 18 months ahead, colour forecasters about 2 years.' },
  { title: '2 to 4 years', lo: 24, hi: 48, why: 'Only macro forces reach this far: climate, economics, consumer values. No one sees individual items this far out.' },
]

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
        Every source must be grade A (measured data or a published method) or grade B (an established trade or editorial authority). Anything else is rejected automatically. Each source only counts fully for the time distance it can actually see.
      </p>
      <div className="flex gap-5 mt-4 t-caption">
        <span className="flex items-center gap-2"><span className="q q-A">A</span> Measured data or published method</span>
        <span className="flex items-center gap-2"><span className="q q-B">B</span> Trade or editorial authority</span>
      </div>

      <div className="space-y-10 mt-10">
        {BANDS.map((band) => {
          const list = edition.sources
            .filter((s) => s.lead[0] <= band.hi && s.lead[1] >= band.lo)
            .sort((a, b) => a.quality.localeCompare(b.quality) || (cited.get(b.id) ?? 0) - (cited.get(a.id) ?? 0))
          const aCount = list.filter((s) => s.quality === 'A').length
          return (
            <section key={band.title}>
              <div className="flex items-baseline justify-between gap-4 px-4 mb-2">
                <div>
                  <div className="t-headline">{band.title}</div>
                  <div className="t-caption">{band.why}</div>
                </div>
                <div className="t-caption shrink-0 num">{aCount} A · {list.length - aCount} B</div>
              </div>
              <div className="group">
                {list.map((s) => (
                  <a key={s.id} href={s.url} target="_blank" rel="noreferrer" className="row" style={{ alignItems: 'flex-start' }}>
                    <span className={`q q-${s.quality} mt-0.5`}>{s.quality}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium" style={{ fontSize: 15 }}>{s.name}</div>
                      <div className="t-caption">{s.measures}</div>
                      <div className="t-footnote mt-0.5">{TIER_LABEL[s.tier]} · {leadLabel(s.lead)}</div>
                    </div>
                    <div className="text-right t-caption num shrink-0">
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
        After five resolved calls, a source's weight moves with its track record (0.6× to 1.4×). Outlets from the same group count as one voice. Paywalled platforms (WGSN's core product, EDITED, full Tagwalk reports) are used only through what they publish openly.
      </p>
    </div>
  )
}
