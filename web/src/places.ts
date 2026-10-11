/**
 * Placing a listing on the map. Pure, so the failure path can be tested with an injected geocoder;
 * the owner form passes `app.maps.geocode`.
 */

export interface Place {
  lat: number
  lng: number
}

/** One geocoder result, as far as placement needs it. `address` is what the geocoder reports. */
export interface GeocodeHit {
  lat: number
  lng: number
  address?: Record<string, string>
}

export type Geocoder = (query: string) => Promise<GeocodeHit[]>

/**
 * The text sent to the geocoder: the owner's location and suburb, biased to Victoria, Australia.
 * Null when there is nothing to place, so clearing the address clears the pin.
 */
export function addressQuery(location: string, suburb: string): string | null {
  const parts = [location.trim(), suburb.trim()].filter(Boolean)
  return parts.length ? [...parts, 'VIC', 'Australia'].join(', ') : null
}

/**
 * The place for a query, or null. A missing query, no match, a match outside Australia, bad
 * coordinates, or a failed request all come back as null: the listing still saves without a pin.
 */
export async function locate(query: string | null, geocode: Geocoder): Promise<Place | null> {
  if (query === null) return null
  try {
    const hits = await geocode(query)
    const hit = hits.find((h) => Number.isFinite(h.lat) && Number.isFinite(h.lng) && (h.address?.country_code ?? 'au') === 'au')
    return hit ? { lat: hit.lat, lng: hit.lng } : null
  } catch {
    return null
  }
}
