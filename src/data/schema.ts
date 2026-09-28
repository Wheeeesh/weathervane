import { z } from 'zod'

// Inputs live in /data (edited by the weekly Routine); outputs live in
// /public/data (written only by scripts/score.ts). Both are validated here.

export const CATEGORIES = ['silhouette', 'colour', 'material', 'print', 'footwear', 'bags', 'jewellery', 'aesthetic'] as const
export const SEGMENTS = ['womens', 'mens', 'unisex'] as const
export const MARKETS = ['luxury', 'contemporary', 'high-street', 'streetwear'] as const
export const REGIONS = ['global', 'europe', 'north-america', 'asia'] as const
export const STAGES = ['emerging', 'early', 'rising', 'peak', 'fading'] as const
export const STANCES = ['rising', 'peaking', 'declining'] as const
export const TIERS = ['data', 'forecaster', 'editorial', 'retail'] as const
export const QUALITIES = ['A', 'B'] as const
export const BASES = ['measured', 'method', 'authority'] as const
/** Rogers' diffusion of innovations: who is wearing a trend at a given moment. */
export const ADOPTERS = ['innovators', 'early-adopters', 'early-majority', 'late-majority', 'laggards'] as const

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD')
const yearMonth = z.string().regex(/^\d{4}-\d{2}$/, 'YYYY-MM')
const editionId = z.string().regex(/^\d{4}-W\d{2}$/, 'YYYY-Www')
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/)
const https = z.string().url().startsWith('https://')

export const Source = z.object({
  id: z.string(),
  name: z.string(),
  family: z.string(),
  tier: z.enum(TIERS),
  // Quality bar: A = measured data or a published method; B = established trade or editorial authority.
  quality: z.enum(QUALITIES),
  basis: z.enum(BASES),
  // The time distance (months from today) this source's evidence can speak to.
  lead: z.tuple([z.number().int(), z.number().int()]),
  measures: z.string(),
  url: https,
})

export const Trend = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(2),
  definition: z.string().min(10),
  category: z.enum(CATEGORIES),
  segment: z.enum(SEGMENTS),
  markets: z.array(z.enum(MARKETS)).min(1),
  regions: z.array(z.enum(REGIONS)).min(1),
  stage: z.enum(STAGES),
  swatch: hex,
  searchTerm: z.string(),
  reasoning: z.string().min(40),
  wouldChange: z.string().min(10),
  addedIn: editionId,
  status: z.enum(['active', 'retired']),
})

const wordCount = (s: string) => s.trim().split(/\s+/).length

export const Signal = z
  .object({
    id: z.string(),
    trendId: z.string(),
    sourceId: z.string(),
    date: isoDate,
    dateApprox: z.boolean().optional(),
    stance: z.enum(STANCES),
    strength: z.number().min(0).max(1),
    // When the source expects the trend to be mainstream. Required for "rising".
    target: yearMonth.optional(),
    url: https,
    via: z.string().optional(),
    summary: z.string().refine((s) => wordCount(s) <= 40, 'summary must be ≤ 40 words'),
  })
  .refine((s) => s.stance !== 'rising' || !!s.target, { message: 'rising signals need a target month' })

// One weekly judgement per trend: is it mainstream today, by its resolution criterion?
// Every past prediction that falls due near this date resolves against it.
export const Observation = z.object({
  trendId: z.string(),
  date: isoDate,
  mainstream: z.union([z.literal(0), z.literal(1)]),
  evidence: z.string().min(10),
})

// Derived by scripts/score.ts, never hand-written.
export const Outcome = z.object({
  trendId: z.string(),
  edition: editionId,
  horizon: z.number().int(),
  predicted: z.number().min(0).max(1),
  outcome: z.union([z.literal(0), z.literal(1)]),
  resolvedOn: isoDate,
})

const Point = z.object({ m: z.number().int(), p: z.number(), lo: z.number(), hi: z.number() })

export const FamilyView = z.object({
  family: z.string(),
  sources: z.array(z.string()),
  weight: z.number(),
  stance: z.enum(STANCES),
  centre: z.number(),
  agrees: z.boolean(),
})

export const Forecast = z.object({
  curve: z.array(Point).length(49),
  centre: z.number(),
  amplitude: z.number(),
  peak: z.object({ m: z.number(), p: z.number() }),
  window: z.tuple([z.number(), z.number()]).nullable(),
  consensus: z.object({
    families: z.array(FamilyView),
    agreeing: z.number().int(),
    total: z.number().int(),
    agreement: z.number(),
    evidence: z.number(),
  }),
})

export const EditionTrend = Trend.extend({
  signals: z.array(
    z.object({
      id: z.string(), sourceId: z.string(), date: isoDate, dateApprox: z.boolean().optional(),
      stance: z.enum(STANCES), strength: z.number(), target: yearMonth.optional(),
      url: https, via: z.string().optional(), summary: z.string(), weight: z.number(),
    }),
  ),
  forecast: Forecast,
  delta: z.record(z.string(), z.number()).nullable(),
  isNew: z.boolean(),
})

export const Edition = z.object({
  id: editionId,
  date: isoDate,
  method: z.string(),
  horizons: z.array(z.number().int()),
  trends: z.array(EditionTrend),
  dropped: z.array(z.object({ id: z.string(), name: z.string() })),
  sources: z.array(Source.extend({ weight: z.number(), prior: z.number(), resolved: z.number().int(), hitRate: z.number().nullable() })),
})

export const EditionIndex = z.object({
  latest: editionId,
  editions: z.array(z.object({ id: editionId, date: isoDate, trends: z.number().int(), signals: z.number().int() })),
})

export const Accuracy = z.object({
  resolved: z.number().int(),
  brier: z.number().nullable(),
  baselineBrier: z.number().nullable(),
  bins: z.array(z.object({ lo: z.number(), hi: z.number(), n: z.number().int(), predicted: z.number(), observed: z.number() })),
  nextResolution: isoDate.nullable(),
  pending: z.number().int(),
})

export const History = z.record(z.string(), z.array(z.object({ edition: editionId, p: z.array(z.number()) })))

export type Source = z.infer<typeof Source>
export type Trend = z.infer<typeof Trend>
export type Signal = z.infer<typeof Signal>
export type Outcome = z.infer<typeof Outcome>
export type Observation = z.infer<typeof Observation>
export type Forecast = z.infer<typeof Forecast>
export type EditionTrend = z.infer<typeof EditionTrend>
export type Edition = z.infer<typeof Edition>
export type EditionIndex = z.infer<typeof EditionIndex>
export type Accuracy = z.infer<typeof Accuracy>
export type History = z.infer<typeof History>
export type Category = (typeof CATEGORIES)[number]
export type Stage = (typeof STAGES)[number]
export type Stance = (typeof STANCES)[number]
export type Tier = (typeof TIERS)[number]
export type Adopter = (typeof ADOPTERS)[number]
