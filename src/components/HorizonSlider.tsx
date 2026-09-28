import { LONG_RANGE, MONTHS } from '../lib/scoring'
import { horizonDate, horizonName, horizonShort, monthLong, season } from '../lib/format'

export const PRESETS = [0, 6, 12, 24, 36, 48]
/** Half the slider thumb: the track's usable span is inset by this on both sides. */
export const THUMB_INSET = 14

interface Props {
  m: number
  onChange: (m: number) => void
  editionDate: string
  compact?: boolean
}

/** Segmented presets for the big jumps, a slider for single months. */
export function HorizonSlider({ m, onChange, editionDate, compact }: Props) {
  const at = horizonDate(editionDate, m)
  const pct = (x: number) => (x / MONTHS) * 100
  const track = `linear-gradient(to right, var(--accent) 0 ${pct(m)}%, var(--fill) ${pct(m)}% ${pct(LONG_RANGE)}%, color-mix(in srgb, var(--orange) 22%, transparent) ${pct(LONG_RANGE)}% 100%)`

  // January of each year, for a quiet year axis under the slider.
  const years: { label: string; at: number }[] = []
  for (let i = 1; i <= MONTHS; i++) {
    const d = horizonDate(editionDate, i)
    if (d.slice(5, 7) === '01') years.push({ label: d.slice(0, 4), at: i })
  }

  return (
    <div>
      {!compact && (
        <div className="mb-5">
          <div className="t-hero">{monthLong(at)}</div>
          <div className="flex items-center gap-2 flex-wrap mt-1.5">
            <span className="t-sub">{season(at)} · {horizonName(m)}</span>
            {m > LONG_RANGE && <span className="badge-long">Long range · low confidence</span>}
          </div>
        </div>
      )}
      <div className="seg" role="tablist" aria-label="Forecast horizon">
        {PRESETS.map((h) => (
          <button key={h} role="tab" aria-selected={m === h} className={m === h ? 'on' : ''} onClick={() => onChange(h)}>
            {horizonShort(h)}
          </button>
        ))}
      </div>
      <div className="mt-3">
        <input
          type="range"
          className="range"
          min={0}
          max={MONTHS}
          step={1}
          value={m}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ ['--track' as string]: track }}
          aria-label="Forecast horizon in months"
          aria-valuetext={`${horizonName(m)}, ${monthLong(at)}`}
        />
        <div className="years" aria-hidden>
          {years.map((y) => (
            <span key={y.label} style={{ left: `${pct(y.at)}%` }}>{y.label}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
