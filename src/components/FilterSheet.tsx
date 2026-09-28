import { useEffect } from 'react'
import { CATEGORIES, MARKETS, REGIONS, SEGMENTS } from '../data/schema'
import { CATEGORY_LABEL, MARKET_LABEL, REGION_LABEL, SEGMENT_LABEL } from '../lib/format'
import type { ViewParams } from '../lib/params'

type ListKey = 'cat' | 'seg' | 'tier' | 'region'

const GROUPS: { key: ListKey; title: string; options: readonly string[]; labels: Record<string, string> }[] = [
  { key: 'cat', title: 'Category', options: CATEGORIES, labels: CATEGORY_LABEL },
  { key: 'seg', title: 'Segment', options: SEGMENTS, labels: SEGMENT_LABEL },
  { key: 'tier', title: 'Market', options: MARKETS, labels: MARKET_LABEL },
  { key: 'region', title: 'Region', options: REGIONS, labels: REGION_LABEL },
]

export function toggle(list: string[], v: string) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
}

interface Props {
  params: ViewParams
  set: (p: Partial<ViewParams>) => void
  onClose: () => void
  onClear: () => void
  resultCount: number
}

export function FilterSheet({ params, set, onClose, onClear, resultCount }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="sheet" role="dialog" aria-modal="true" aria-label="Filters">
        <div className="sheet-grip" />
        <div className="sheet-head">
          <button className="btn link" onClick={onClear}>Reset</button>
          <div className="font-semibold">Filters</div>
          <button className="btn link font-semibold" onClick={onClose}>Done</button>
        </div>

        <div className="px-5 pb-4 space-y-6">
          {GROUPS.map((g) => (
            <section key={g.key}>
              <div className="t-section">{g.title}</div>
              <div className="group p-3 pill-row">
                {g.options.map((o) => (
                  <button key={o} className={`pill ${params[g.key].includes(o) ? 'on' : ''}`} aria-pressed={params[g.key].includes(o)} onClick={() => set({ [g.key]: toggle(params[g.key], o) } as Partial<ViewParams>)}>
                    {g.labels[o]}
                  </button>
                ))}
              </div>
            </section>
          ))}

          <section>
            <div className="t-section">Minimum probability</div>
            <div className="group px-4 py-3">
              <div className="flex items-center gap-4">
                <input type="range" className="range flex-1" min={0} max={90} step={10} value={params.minp} onChange={(e) => set({ minp: Number(e.target.value) })} aria-label="Minimum probability"
                  style={{ ['--track' as string]: `linear-gradient(to right, var(--accent) 0 ${(params.minp / 90) * 100}%, var(--fill) ${(params.minp / 90) * 100}% 100%)` }} />
                <span className="num w-10 text-right">{params.minp}%</span>
              </div>
            </div>
            <p className="t-footnote mt-1.5 ml-4">At the horizon you've selected.</p>
          </section>

          <section>
            <div className="t-section">Sources in agreement</div>
            <div className="seg wide">
              {[0, 2, 3, 4].map((n) => (
                <button key={n} className={params.minc === n ? 'on' : ''} onClick={() => set({ minc: n })}>{n === 0 ? 'Any' : `${n}+`}</button>
              ))}
            </div>
            <p className="t-footnote mt-1.5 ml-4">Independent source groups telling the same timing story.</p>
          </section>
        </div>

        <div className="sheet-foot">
          <button className="btn primary flex-1" onClick={onClose}>Show {resultCount} trend{resultCount === 1 ? '' : 's'}</button>
        </div>
      </aside>
    </>
  )
}
