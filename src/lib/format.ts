import type { Category, Stage, Stance, Tier } from '../data/schema'
import { addMonths } from './scoring'

export const pct = (p: number) => `${Math.round(p * 100)}%`
export const range = (lo: number, hi: number) => `${Math.round(lo * 100)}–${Math.round(hi * 100)}%`
export const signedPts = (d: number) => {
  const v = Math.round(d * 100)
  return v === 0 ? '±0' : `${v > 0 ? '+' : '−'}${Math.abs(v)}`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Retail seasons: SS sells Feb–Jul, AW sells Aug–Jan. */
export function season(iso: string) {
  const [y, m] = iso.split('-').map(Number)
  if (m >= 2 && m <= 7) return `SS${String(y).slice(2)}`
  return `AW${String(m === 1 ? y - 1 : y).slice(2)}`
}

const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function monthLong(iso: string) {
  const [y, m] = iso.split('-').map(Number)
  return `${MONTHS_LONG[m - 1]} ${y}`
}

export function monthLabel(iso: string) {
  const [y, m] = iso.split('-').map(Number)
  return `${MONTHS[m - 1]} ${y}`
}

export function horizonDate(editionDate: string, m: number) {
  return addMonths(editionDate, m)
}

export function horizonName(m: number) {
  if (m === 0) return 'Now'
  if (m % 12 === 0) return m === 12 ? 'In 1 year' : `In ${m / 12} years`
  if (m > 12) return `In ${Math.floor(m / 12)} yr ${m % 12} mo`
  return `In ${m} month${m === 1 ? '' : 's'}`
}

/** Compact label for segmented controls and axes. */
export function horizonShort(m: number) {
  if (m === 0) return 'Now'
  return m % 12 === 0 ? `${m / 12}Y` : `${m}M`
}

export function longDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

export const CATEGORY_LABEL: Record<Category, string> = {
  silhouette: 'Silhouette', colour: 'Colour', material: 'Material', print: 'Print',
  footwear: 'Footwear', bags: 'Bags', jewellery: 'Jewellery', aesthetic: 'Aesthetic',
}
export const STAGE_LABEL: Record<Stage, string> = {
  emerging: 'Emerging', early: 'Early adopters', rising: 'Rising', peak: 'Peak', fading: 'Fading',
}
export const STANCE_LABEL: Record<Stance, string> = { rising: 'Rising', peaking: 'Peaking', declining: 'Declining' }
export const TIER_LABEL: Record<Tier, string> = {
  data: 'Market data', forecaster: 'Forecaster', editorial: 'Editorial', retail: 'Retail',
}
export const SEGMENT_LABEL = { womens: 'Womenswear', mens: 'Menswear', unisex: 'Unisex' } as const
export const MARKET_LABEL = { luxury: 'Luxury', contemporary: 'Contemporary', 'high-street': 'High street', streetwear: 'Streetwear' } as const
export const REGION_LABEL = { global: 'Global', europe: 'Europe', 'north-america': 'North America', asia: 'Asia' } as const

/** Plain-language read of a probability, the way a weather forecast would say it. */
export function verdict(p: number) {
  if (p >= 0.8) return 'Near certain'
  if (p >= 0.6) return 'Likely'
  if (p >= 0.4) return 'Toss-up'
  if (p >= 0.2) return 'Unlikely'
  return 'Remote'
}
