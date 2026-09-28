import { useMemo, useState } from 'react'
import { CATEGORIES } from '../data/schema'
import { FilterSheet, toggle } from '../components/FilterSheet'
import { HorizonSlider } from '../components/HorizonSlider'
import { Loading } from '../components/Loading'
import { TrendCard } from '../components/TrendCard'
import { useEdition } from '../lib/data'
import { CATEGORY_LABEL } from '../lib/format'
import { applyFilters, useViewParams, type SortKey } from '../lib/params'

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'probability', label: 'Most likely' },
  { key: 'movers', label: 'Biggest movers' },
  { key: 'consensus', label: 'Strongest consensus' },
  { key: 'soonest', label: 'Peaking soonest' },
]

export default function Forecast() {
  const { params, set, activeFilters, clearFilters, search } = useViewParams()
  const { edition, error } = useEdition(params.e)
  const [open, setOpen] = useState(false)
  const trends = useMemo(() => (edition ? applyFilters(edition.trends, params) : []), [edition, params])

  if (!edition) return <Loading error={error} />

  const likely = trends.filter((t) => t.forecast.curve[params.m].p >= 0.6).length
  const tossups = trends.filter((t) => { const p = t.forecast.curve[params.m].p; return p >= 0.4 && p < 0.6 }).length

  return (
    <div className="wrap pt-6">
      <HorizonSlider m={params.m} onChange={(m) => set({ m })} editionDate={edition.date} />

      <p className="lede mt-6 mb-6 max-w-3xl">
        <span className="display" style={{ color: 'var(--accent)' }}>{likely}</span> {likely === 1 ? 'trend is' : 'trends are'} likely to be mainstream by then,
        with {tossups} toss-up{tossups === 1 ? '' : 's'}. {activeFilters ? `Filtered to ${trends.length} of ${edition.trends.length}.` : `${edition.trends.length} trends tracked.`}
      </p>

      <div className="flex items-center gap-2 pb-4 flex-wrap">
        <div className="chip-scroll basis-full md:basis-auto md:flex-1 min-w-0">
          <button className={`chip ${!params.cat.length ? 'on' : ''}`} onClick={() => set({ cat: [] })}>All</button>
          {CATEGORIES.map((c) => (
            <button key={c} className={`chip ${params.cat.includes(c) ? 'on' : ''}`} aria-pressed={params.cat.includes(c)} onClick={() => set({ cat: toggle(params.cat, c) })}>
              {CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          <select className="select" value={params.sort} onChange={(e) => set({ sort: e.target.value as SortKey })} aria-label="Sort">
            {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <button className={`btn ${activeFilters ? 'solid' : ''}`} onClick={() => setOpen(true)}>
            Filters{activeFilters ? ` · ${activeFilters}` : ''}
          </button>
        </div>
      </div>

      {trends.length ? (
        <div className="grid-cards">
          {trends.map((t, i) => <TrendCard key={t.id} trend={t} m={params.m} search={search} index={i} />)}
        </div>
      ) : (
        <div className="rule-strong py-20 text-center">
          <div className="display" style={{ fontSize: 32 }}>Nothing on the map with these filters.</div>
          <button className="btn mt-5" onClick={clearFilters}>Clear filters</button>
        </div>
      )}

      {open && <FilterSheet params={params} set={set} onClose={() => setOpen(false)} onClear={clearFilters} resultCount={trends.length} />}
    </div>
  )
}
