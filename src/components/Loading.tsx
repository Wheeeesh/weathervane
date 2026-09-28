export function Loading({ error }: { error?: string | null }) {
  return (
    <div className="wrap py-24 text-center">
      <div className="display muted" style={{ fontSize: 32 }}>{error ? 'The forecast failed to load.' : 'Reading the barometer…'}</div>
      {error && <div className="mono text-xs muted mt-3">{error}</div>}
    </div>
  )
}
