import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { Edition, EditionIndex, Observation, Signal, Source, Trend } from '../src/data/schema'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const DATA = join(ROOT, 'data')
export const OUT = join(ROOT, 'public', 'data')

export function readJson<T>(path: string, schema: z.ZodType<T>): T {
  const raw = JSON.parse(readFileSync(path, 'utf8'))
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    const issues = parsed.error.issues.slice(0, 10).map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(`${path.replace(ROOT + '/', '')} is invalid:\n${issues}`)
  }
  return parsed.data
}

export function writeJson(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n')
}

export const loadSources = () => readJson(join(DATA, 'sources.json'), z.array(Source))
export const loadTrends = () => readJson(join(DATA, 'trends.json'), z.array(Trend))
export const loadObservations = () => readJson(join(DATA, 'observations.json'), z.array(Observation))

export function loadSignals() {
  const dir = join(DATA, 'signals')
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .flatMap((f) => readJson(join(dir, f), z.array(Signal)))
}

export function loadIndex() {
  const path = join(OUT, 'index.json')
  return existsSync(path) ? readJson(path, EditionIndex) : null
}

export function loadEdition(id: string) {
  return readJson(join(OUT, 'editions', `${id}.json`), Edition)
}

export function today() {
  return new Date().toISOString().slice(0, 10)
}
