import { useEffect } from 'react'
import { CATEGORIES, MARKETS, REGIONS, SEGMENTS, STAGES } from '../data/schema'
import { CATEGORY_LABEL, MARKET_LABEL, REGION_LABEL, SEGMENT_LABEL, STAGE_LABEL } from '../lib/format'
import type { ViewParams } from '../lib/params'

type ListKey = 'cat' | 'seg' | 'tier' | 'region' | 'stage'

const GROUPS: { key: ListKey; title: string; options: readonly string[]; labels: Record<string, string> }[] = [
  { key: 'cat', title: 'Category', options: CATEGORIES, labels: CATEGORY_LABEL },
  { key: 'seg', title: 'Segment', options: SEGMENTS, labels: SEGMENT_LABEL },
  { key: 'tier', title: 'Market', options: MARKETS, labels: MARKET_LABEL },
  { key: 'region', title: 'Region', options: REGIONS, labels: REGION_LABEL },
  { key: 'stage', title: 'Lifecycle stage', options: STAGES, labels: STAGE_LABEL },
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
        <div className="flex items-center justify-between mb-5">
          <div className="display" style={{ fontSize: 34 }}>Filters</div>
          <button className="btn" onClick={onClose} aria-label="Close filters">Close</button>
        </div>

        {GROUPS.map((g) => (
          <section key={g.key} className="rule py-4">
            <div className="eyebrow mb-3">{g.title}</div>
            <div className="chip-row">
              {g.options.map((o) => (
                <button key={o} className={`chip ${params[g.key].includes(o) ? 'on' : ''}`} aria-pressed={params[g.key].includes(o)} onClick={() => set({ [g.key]: toggle(params[g.key], o) } as Partial<ViewParams>)}>
                  {g.labels[o]}
                </button>
              ))}
            </div>
          </section>
        ))}

        <section className="rule py-4">
          <div className="flex justify-between items-baseline mb-2">
            <div className="eyebrow">Minimum probability</div>
            <div className="mono text-sm">{params.minp}%</div>
          </div>
          <input type="range" min={0} max={90} step={10} value={params.minp} onChange={(e) => set({ minp: Number(e.target.value) })} className="w-full accent-[var(--accent)]" aria-label="Minimum probability" />
          <p className="text-xs muted mt-1">At the horizon you've selected.</p>
        </section>

        <section className="rule py-4">
          <div className="eyebrow mb-3">Sources in agreement, at least</div>
          <div className="chip-row">
            {[0, 2, 3, 4].map((n) => (
              <button key={n} className={`chip ${params.minc === n ? 'on' : ''}`} onClick={() => set({ minc: n })}>
                {n === 0 ? 'Any' : `${n}+`}
              </button>
            ))}
          </div>
          <p className="text-xs muted mt-2">Independent source families whose timing matches the consensus.</p>
        </section>

        <div className="rule-strong pt-4 pb-2 flex gap-2 sticky -bottom-5" style={{ background: 'var(--paper)' }}>
          <button className="btn" onClick={onClear}>Clear all</button>
          <button className="btn solid flex-1" onClick={onClose}>Show {resultCount} trend{resultCount === 1 ? '' : 's'}</button>
        </div>
      </aside>
    </>
  )
}
