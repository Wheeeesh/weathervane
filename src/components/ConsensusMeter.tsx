import type { Forecast } from '../data/schema'

/** One dot per independent source group; filled = part of the largest agreeing group. */
export function ConsensusMeter({ consensus }: { consensus: Forecast['consensus'] }) {
  const { agreeing, total } = consensus
  const label = total === 1 ? 'Single source' : `${agreeing} of ${total} sources agree`
  return (
    <div className="flex items-center gap-2" title={label}>
      <div className="flex gap-1" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: i < agreeing ? 'var(--text)' : 'var(--fill)' }} />
        ))}
      </div>
      <span className="t-caption">{label}</span>
    </div>
  )
}
