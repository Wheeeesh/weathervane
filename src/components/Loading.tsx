export function Loading({ error }: { error?: string | null }) {
  return (
    <div className="wrap py-32 text-center">
      <div className="t-headline text-2">{error ? 'The forecast couldn’t load.' : 'Loading forecast…'}</div>
      {error && <div className="t-footnote mt-2">{error}</div>}
    </div>
  )
}
