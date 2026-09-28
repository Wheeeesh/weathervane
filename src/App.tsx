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
  { to: '/week', label: 'This week' },
  { to: '/sources', label: 'Sources' },
  { to: '/accuracy', label: 'Accuracy & method' },
]

function Isobars() {
  // Decorative pressure lines — the weather-map motif.
  const lines = Array.from({ length: 9 }, (_, i) => {
    const y = 20 + i * 22
    return `M-20,${y} C200,${y - 40 + i * 6} 420,${y + 50 - i * 4} 700,${y + 6} S1100,${y - 36} 1300,${y + 10}`
  })
  return (
    <svg className="isobars" viewBox="0 0 1280 220" preserveAspectRatio="none" aria-hidden>
      {lines.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="currentColor" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  )
}

export default function App() {
  const { params, search } = useViewParams()
  const { edition, index, isLatest } = useEdition(params.e)
  const location = useLocation()
  const keep = search ? `?${search}` : ''

  return (
    <div className="min-h-screen flex flex-col">
      <header className="masthead">
        <Isobars />
        <div className="wrap relative">
          <div className="flex items-end justify-between gap-4 pt-6 pb-3 flex-wrap">
            <NavLink to={`/${keep}`} className="wordmark">
              Weather<em>vane</em>
            </NavLink>
            <div className="sm:text-right pb-1">
              <div className="eyebrow">The weekly fashion forecast</div>
              <div className="mono text-xs mt-1">
                {edition ? (
                  <>
                    Edition {edition.id.replace('-W', ' · Week ')} · {longDate(edition.date)}
                    {!isLatest && index && (
                      <span style={{ color: 'var(--accent)' }}> · archive</span>
                    )}
                  </>
                ) : (
                  ' '
                )}
              </div>
            </div>
          </div>
          <nav className="nav -mx-3" aria-label="Sections">
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

      <footer className="rule-strong mt-16">
        <div className="wrap py-6 flex flex-wrap justify-between gap-3 text-xs muted">
          <span>Probabilities are computed from cited signals by a fixed model, then scored against what actually happened.</span>
          <span className="mono">Updated every Monday</span>
        </div>
      </footer>
    </div>
  )
}
