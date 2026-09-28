import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { useEdition } from './lib/data'
import { longDate } from './lib/format'
import { useViewParams } from './lib/params'
import Accuracy from './routes/Accuracy'
import Forecast from './routes/Forecast'
import Sources from './routes/Sources'
import Timeline from './routes/Timeline'
import TrendDetail from './routes/TrendDetail'
import Week from './routes/Week'

const NAV = [
  { to: '/', label: 'Forecast' },
  { to: '/timeline', label: 'Timeline' },
  { to: '/week', label: 'This Week' },
  { to: '/sources', label: 'Sources' },
  { to: '/accuracy', label: 'Accuracy' },
]

function Mark() {
  return (
    <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <path d="M9 20l7-9 7 9" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function App() {
  const { params, search } = useViewParams()
  const { edition, isLatest } = useEdition(params.e)
  const location = useLocation()
  const keep = search ? `?${search}` : ''

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bar">
        <div className="wrap bar-inner">
          <NavLink to={`/${keep}`} className="brand">
            <Mark /> Weathervane
          </NavLink>
          <nav className="nav" aria-label="Sections">
            {NAV.map((n) => (
              <NavLink key={n.to} to={`${n.to}${keep}`} end={n.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1" key={location.pathname}>
        <Routes>
          <Route path="/" element={<Forecast />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/trend/:id" element={<TrendDetail />} />
          <Route path="/week" element={<Week />} />
          <Route path="/sources" element={<Sources />} />
          <Route path="/accuracy" element={<Accuracy />} />
          <Route path="*" element={<Forecast />} />
        </Routes>
      </main>

      <footer className="mt-20 border-t" style={{ borderColor: 'var(--sep)' }}>
        <div className="wrap py-6 flex flex-wrap justify-between gap-2 t-footnote">
          <span>
            {edition ? `Edition ${edition.id} · ${longDate(edition.date)}${isLatest ? '' : ' · archive'} · ` : ''}Updated every Monday.
          </span>
          <span>Probabilities come from a fixed model over cited sources, and are scored against what actually happens.</span>
        </div>
      </footer>
    </div>
  )
}
