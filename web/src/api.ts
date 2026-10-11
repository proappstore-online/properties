import { initPro } from '@proappstore/sdk'

// platform-cookie is the current auth mode (PAS-AUTH-001): the host sets the session
// cookie and data calls go through /.pas/data on the app's own origin.
export const app = initPro({ appId: 'properties', authMode: 'platform-cookie' })

/**
 * Extension points. The archetype is "owners publish listings, seekers request them";
 * the noun each side uses is yours to pick (booking, application, enquiry, match…).
 */
export const REQUEST = { noun: 'request', plural: 'requests', verb: 'Request' } as const
export const CATEGORIES = ['room', 'job', 'service', 'vehicle', 'other'] as const
/** Optional map capability: geocode a listing's location on save and show it on the detail page. */
export const MAPS_ENABLED = false

/** Price period: a weekly rent or an asking price. Enforced by the write actions in mcp.json. */
export const PRICE_UNITS = [
  { value: 'per_week', label: 'Rent, per week' },
  { value: 'sale', label: 'For sale' },
] as const
export type PriceUnit = (typeof PRICE_UNITS)[number]['value']

export type ListingStatus = 'active' | 'paused' | 'archived'
export type RequestStatus = 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled'

export interface Listing {
  id: string
  owner_id: string
  owner_name: string
  status: ListingStatus
  title: string
  description: string
  category: string
  location: string
  lat: number | null
  lng: number | null
  price: number | null
  /** 'per_week' or 'sale' for new listings; older listings may carry free text. */
  price_unit: string
  suburb: string
  bedrooms: number | null
  bathrooms: number | null
  car_spaces: number | null
  /** JSON array of public storage keys (see uploadPhoto). */
  images: string
  created_at: number
  updated_at: number
}

export interface Request {
  id: string
  listing_id: string
  requester_id: string
  requester_name?: string
  status: RequestStatus
  note: string
  created_at: number
  updated_at: number
  listing_title: string
  owner_id?: string
  owner_name?: string
}

export interface Message {
  id: string
  listing_id: string
  sender_id: string
  sender_name: string
  recipient_id: string
  body: string
  created_at: number
}

export interface Conversation {
  listing_id: string
  listing_title: string
  other_id: string
  other_name: string
  last_at: number
}

export interface Review {
  id: string
  listing_id: string
  author_name: string
  rating: number
  comment: string
  created_at: number
}

/** Call a public query action (no session; PAS-DATA-011 tools only). */
export async function pub<T>(name: string, params: Record<string, unknown> = {}): Promise<T[]> {
  const res = await app.actions.callPublic<{ rows: T[] }>(name, params)
  return res.rows
}

/** Call an authenticated query action; resolves to the rows. */
export async function q<T>(name: string, params: Record<string, unknown> = {}): Promise<T[]> {
  const res = await app.actions.call<{ rows: T[] }>(name, params)
  return res.rows
}

/** Call an execute action; resolves to the number of rows changed (0 = refused by a guard). */
export async function x(name: string, params: Record<string, unknown> = {}): Promise<number> {
  const res = await app.actions.call<{ meta: { changes: number } }>(name, params)
  return res.meta.changes
}

export function images(listing: Pick<Listing, 'images'>): string[] {
  try {
    const parsed: unknown = JSON.parse(listing.images)
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === 'string') : []
  } catch {
    return []
  }
}

export function imageUrl(key: string): string {
  return app.storage.publicUrl(key)
}

/** Any signed-in user may upload listing photos under their own public prefix. */
export async function uploadPhoto(file: File): Promise<string> {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const res = await app.storage.uploadUserPublic(`${crypto.randomUUID()}-${safe}`, file, file.type)
  return res.key
}

const DOLLARS = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 })

/** "$650 / week" for rent, "$1,250,000" for sale. Legacy free-text units are kept as written. */
export function money(l: Pick<Listing, 'price' | 'price_unit'>): string {
  if (l.price === null || l.price === undefined) return ''
  const amount = DOLLARS.format(l.price)
  if (l.price_unit === 'sale') return amount
  if (l.price_unit === 'per_week') return `${amount} / week`
  return l.price_unit ? `${amount} / ${l.price_unit}` : amount
}

/** "3 bed · 2 bath · 1 car". Unknown counts are left out rather than shown as 0 or "null". */
export function features(l: Pick<Listing, 'bedrooms' | 'bathrooms' | 'car_spaces'>): string {
  const part = (n: number | null, one: string, many: string) => (n === null || n === undefined ? '' : `${n} ${n === 1 ? one : many}`)
  return [part(l.bedrooms, 'bed', 'beds'), part(l.bathrooms, 'bath', 'baths'), part(l.car_spaces, 'car', 'cars')].filter(Boolean).join(' · ')
}

export function when(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}
