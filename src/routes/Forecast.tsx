import { useCallback, useMemo, useState } from 'react'
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
  const close = useCallback(() => setOpen(false), [])
  const trends = useMemo(() => (edition ? applyFilters(edition.trends, params) : []), [edition, params])

  if (!edition) return <Loading error={error} />

  const likely = trends.filter((t) => t.forecast.curve[params.m].p >= 0.6).length
  const tossups = trends.filter((t) => { const p = t.forecast.curve[params.m].p; return p >= 0.4 && p < 0.6 }).length

  return (
    <div className="wrap pt-14">
      <HorizonSlider m={params.m} onChange={(m) => set({ m })} editionDate={edition.date} />

      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 mt-8 mb-5">
        <span className="t-body"><strong className="font-semibold">{likely}</strong> <span className="text-2">likely</span></span>
        <span className="t-body"><strong className="font-semibold">{tossups}</strong> <span className="text-2">toss-ups</span></span>
        <span className="t-body text-2">{activeFilters ? `${trends.length} of ${edition.trends.length} trends` : `${edition.trends.length} trends`}</span>
      </div>

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <div className="pill-scroll basis-full md:basis-auto md:flex-1 min-w-0">
          <button className={`pill ${!params.cat.length ? 'on' : ''}`} onClick={() => set({ cat: [] })}>All</button>
          {CATEGORIES.map((c) => (
            <button key={c} className={`pill ${params.cat.includes(c) ? 'on' : ''}`} aria-pressed={params.cat.includes(c)} onClick={() => set({ cat: toggle(params.cat, c) })}>
              {CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
        <div className="flex gap-2 md:ml-auto mt-2 md:mt-0">
          <select className="select" value={params.sort} onChange={(e) => set({ sort: e.target.value as SortKey })} aria-label="Sort">
            {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <button className={`pill ${activeFilters ? 'on' : ''}`} onClick={() => setOpen(true)}>
            Filters{activeFilters ? ` (${activeFilters})` : ''}
          </button>
        </div>
      </div>

      {trends.length ? (
        <div className="grid-tiles">
          {trends.map((t, i) => <TrendCard key={t.id} trend={t} m={params.m} search={search} index={i} />)}
        </div>
      ) : (
        <div className="card py-20 text-center">
          <div className="t-headline">No trends match these filters.</div>
          <button className="btn link mt-3" onClick={clearFilters}>Clear filters</button>
        </div>
      )}

      {open && <FilterSheet params={params} set={set} onClose={close} onClear={clearFilters} resultCount={trends.length} />}
    </div>
  )
}
