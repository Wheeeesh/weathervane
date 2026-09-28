import type { Forecast } from '../data/schema'

/** One tick per independent source family; filled = its timing agrees with the consensus. */
export function ConsensusMeter({ consensus }: { consensus: Forecast['consensus'] }) {
  const { agreeing, total } = consensus
  const label = total === 1 ? 'Single source' : `${agreeing} of ${total} sources agree`
  return (
    <div className="flex items-center gap-2" title={label}>
      <div className="flex gap-[3px]" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            style={{
              width: 6, height: 14, borderRadius: 1,
              background: i < agreeing ? 'var(--ink)' : 'transparent',
              border: `1px solid ${i < agreeing ? 'var(--ink)' : 'var(--rule-strong)'}`,
            }}
          />
        ))}
      </div>
      <span className="tag" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 12 }}>{label}</span>
    </div>
  )
}
