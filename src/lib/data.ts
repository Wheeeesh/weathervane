import { useEffect, useState } from 'react'
import type { Accuracy, Edition, EditionIndex, History } from '../data/schema'

const cache = new Map<string, Promise<unknown>>()

function load<T>(path: string): Promise<T> {
  if (!cache.has(path)) {
    const p = fetch(`${import.meta.env.BASE_URL}data/${path}`).then((r) => {
      if (!r.ok) throw new Error(`${path}: ${r.status}`)
      return r.json()
    })
    p.catch(() => cache.delete(path))
    cache.set(path, p)
  }
  return cache.get(path) as Promise<T>
}

type State<T> = { data: T | null; error: string | null }

function useJson<T>(path: string | null): State<T> {
  const [state, setState] = useState<State<T>>({ data: null, error: null })
  useEffect(() => {
    if (!path) return
    let live = true
    setState({ data: null, error: null })
    load<T>(path).then(
      (data) => live && setState({ data, error: null }),
      (e: Error) => live && setState({ data: null, error: e.message }),
    )
    return () => {
      live = false
    }
  }, [path])
  return state
}

export const useIndex = () => useJson<EditionIndex>('index.json')
export const useHistory = () => useJson<History>('history.json')
export const useAccuracy = () => useJson<Accuracy>('accuracy.json')

/** The edition picked in the URL (?e=), or the latest. */
export function useEdition(requested: string | null) {
  const index = useIndex()
  const id = index.data ? (requested && index.data.editions.some((e) => e.id === requested) ? requested : index.data.latest) : null
  const edition = useJson<Edition>(id ? `editions/${id}.json` : null)
  return {
    index: index.data,
    edition: edition.data,
    error: index.error ?? edition.error,
    isLatest: !!index.data && id === index.data.latest,
  }
}
