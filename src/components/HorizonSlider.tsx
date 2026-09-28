import { HORIZONS, MONTHS } from '../lib/scoring'
import { horizonDate, horizonName, monthLabel, season } from '../lib/format'

interface Props {
  m: number
  onChange: (m: number) => void
  editionDate: string
  compact?: boolean
}

/** Month-by-month horizon, Now → 24 months, with retail seasons underneath. */
export function HorizonSlider({ m, onChange, editionDate, compact }: Props) {
  const at = horizonDate(editionDate, m)
  const seasons: { label: string; from: number }[] = []
  for (let i = 0; i <= MONTHS; i++) {
    const label = season(horizonDate(editionDate, i))
    if (!seasons.length || seasons[seasons.length - 1].label !== label) seasons.push({ label, from: i })
  }

  return (
    <div className="horizon">
      {!compact && (
        <div className="flex items-end justify-between gap-4 pb-2">
          <div>
            <div className="eyebrow">The forecast for</div>
            <div className="display" style={{ fontSize: 'clamp(34px, 6vw, 56px)' }}>
              {monthLabel(at)} <em className="muted" style={{ fontSize: '0.6em' }}>{season(at)}</em>
            </div>
          </div>
          <div className="mono muted text-right text-xs pb-1">{horizonName(m)}</div>
        </div>
      )}
      <input
        type="range"
        min={0}
        max={MONTHS}
        step={1}
        value={m}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Forecast horizon in months"
        aria-valuetext={`${horizonName(m)}, ${monthLabel(at)}`}
      />
      <div className="ticks" aria-hidden>
        {HORIZONS.map((h) => (
          <button key={h} className={`tick ${h === m ? 'on' : ''} ${h === 1 ? 'tick-minor' : ''}`} style={{ left: `${(h / MONTHS) * 100}%` }} onClick={() => onChange(h)} tabIndex={-1}>
            <span>{h === 0 ? 'Now' : `${h}M`}</span>
          </button>
        ))}
      </div>
      <div className="seasons" aria-hidden>
        {seasons.map((s, i) => {
          const to = seasons[i + 1]?.from ?? MONTHS
          return (
            <span key={s.label} style={{ left: `${(s.from / MONTHS) * 100}%`, width: `${((to - s.from) / MONTHS) * 100}%` }}>
              {to - s.from >= 2 ? s.label : ''}
            </span>
          )
        })}
      </div>
    </div>
  )
}
