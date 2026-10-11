#!/usr/bin/env node
/**
 * Load or remove the demo listings in this app's catalogue.
 *
 *   node scripts/seed-demo.mjs preview                      # print what load would send; no network
 *   PAS_COOKIE='<Cookie header>' node scripts/seed-demo.mjs load
 *   PAS_COOKIE='<Cookie header>' node scripts/seed-demo.mjs remove
 *
 * PAS_COOKIE is the Cookie header your browser sends to properties.proappstore.online while you are
 * signed in as the app owner (DevTools → Network → any request to the site → Request Headers → cookie).
 * It is a session credential: do not commit it, and do not paste it anywhere else.
 *
 * The script uses the app's own actions as that owner (create_listing, set_listing_status and
 * list_my_listings), so it writes nothing an owner could not write by hand. Demo listings are the
 * ones whose title starts with DEMO_PREFIX. "remove" archives them (the template's soft delete); it
 * does not erase rows, so their requests, messages and reviews stay intact.
 */
import { pathToFileURL } from 'node:url'

export const APP_ID = 'properties'
export const DEFAULT_ORIGIN = 'https://properties.proappstore.online'
export const DEMO_PREFIX = '[Demo] '
export const DEMO_NOTE = 'Demo listing: sample data for testing and demos. Not a real property.'
export const OWNER_NAME = 'Demo host'

/**
 * Approximate suburb centres, used only so the demo map has a pin. They are not addresses, and
 * the location text is the suburb, never a street.
 */
const CENTRE = {
  Fitzroy: [-37.7989, 144.9784],
  Brunswick: [-37.7665, 144.961],
  'St Kilda': [-37.8676, 144.9809],
  Richmond: [-37.8229, 144.9986],
  Footscray: [-37.7999, 144.8996],
  Carlton: [-37.7993, 144.9669],
  Hawthorn: [-37.8227, 145.0345],
  Preston: [-37.7422, 145.0001],
  Docklands: [-37.8157, 144.9469],
  'Box Hill': [-37.8192, 145.1217],
}

const listing = (slug, suburb, category, title, description, price, price_unit, bedrooms, bathrooms, car_spaces) => ({
  slug, suburb, category, title, description, price, price_unit, bedrooms, bathrooms, car_spaces,
  lat: CENTRE[suburb][0], lng: CENTRE[suburb][1],
})

/** Twelve sample listings: seven weekly rentals and five sales, six property types, ten suburbs. */
export const DEMO_LISTINGS = [
  listing('fitzroy-flat', 'Fitzroy', 'apartment', 'Sunny two-bedroom flat near Brunswick Street', 'Bright north-facing flat with a shared courtyard and tram stops at the door.', 580, 'per_week', 2, 1, 0),
  listing('brunswick-terrace', 'Brunswick', 'house', 'Renovated terrace with a courtyard', 'Period terrace with a new kitchen, a leafy courtyard and a short walk to the shops.', 690, 'per_week', 3, 1, 1),
  listing('stkilda-apartment', 'St Kilda', 'apartment', 'Bayside apartment with a sea glimpse', 'Second-floor apartment with a balcony, secure parking and an easy walk to the foreshore.', 780000, 'sale', 2, 2, 1),
  listing('richmond-family-home', 'Richmond', 'house', 'Leafy family home close to the park', 'Four bedrooms, a family living area and a double garage on a quiet street.', 1250000, 'sale', 4, 2, 2),
  listing('footscray-studio', 'Footscray', 'studio', 'Light studio near the station', 'Self-contained studio with a kitchenette, ideal for one person near public transport.', 360, 'per_week', 1, 1, 0),
  listing('carlton-room', 'Carlton', 'room_share', 'Furnished room in a share house', 'Furnished room in a friendly share house with a shared kitchen and laundry.', 240, 'per_week', null, null, null),
  listing('hawthorn-townhouse', 'Hawthorn', 'townhouse', 'Family townhouse with a single garage', 'Three bedrooms over two levels, close to schools and the Glenferrie Road shops.', 890000, 'sale', 3, 2, 1),
  listing('preston-unit', 'Preston', 'apartment', 'Quiet unit backing onto parkland', 'Ground-floor unit with a private courtyard that looks onto parkland.', 520, 'per_week', 2, 1, 1),
  listing('docklands-apartment', 'Docklands', 'apartment', 'Harbourside apartment with a balcony', 'Two bedrooms and a wide balcony with views over the docks, with a gym in the building.', 740, 'per_week', 2, 2, 1),
  listing('box-hill-home', 'Box Hill', 'house', 'Starter home with a big backyard', 'Three bedrooms, a large backyard and a carport, close to the train and the shopping centre.', 720000, 'sale', 3, 1, 2),
  listing('preston-block', 'Preston', 'land', 'Level residential block ready to build', 'Flat residential block with services connected, suitable for a single dwelling.', 450000, 'sale', null, null, null),
  listing('richmond-studio', 'Richmond', 'studio', 'Modern studio near the river', 'Newly fitted studio with built-in storage, a short walk to the river trail.', 410, 'per_week', 1, 1, 0),
]

/** The create_listing params for one demo listing. The id is fixed, so loading twice is safe. */
export function demoPayload(item) {
  return {
    id: `demo-${item.slug}`,
    owner_name: OWNER_NAME,
    title: `${DEMO_PREFIX}${item.title}`,
    description: `${DEMO_NOTE}\n\n${item.description}`,
    category: item.category,
    location: `${item.suburb}, Melbourne`,
    suburb: item.suburb,
    lat: item.lat,
    lng: item.lng,
    price: item.price,
    price_unit: item.price_unit,
    bedrooms: item.bedrooms,
    bathrooms: item.bathrooms,
    car_spaces: item.car_spaces,
    images: '[]',
  }
}

export function actionUrl(origin, action) {
  return `${origin}/.pas/api/v1/apps/${APP_ID}/actions/${action}`
}

async function call(origin, cookie, action, params) {
  const response = await fetch(actionUrl(origin, action), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ params }),
  })
  if (!response.ok) throw new Error(`${action} failed: HTTP ${response.status} ${await response.text().catch(() => '')}`.trim())
  return response.json()
}

/** Create each demo listing; one that already exists is set back to active (this restores a removed one). */
export async function load({ origin = DEFAULT_ORIGIN, cookie, log = console.log }) {
  const summary = { created: 0, restored: 0 }
  for (const item of DEMO_LISTINGS) {
    const payload = demoPayload(item)
    const { meta } = await call(origin, cookie, 'create_listing', payload)
    if (meta.changes === 1) {
      summary.created++
      log(`created   ${payload.id}  ${payload.title}`)
    } else {
      await call(origin, cookie, 'set_listing_status', { id: payload.id, status: 'active' })
      summary.restored++
      log(`active    ${payload.id}  ${payload.title}`)
    }
  }
  return summary
}

/** Archive every demo listing the owner has, leaving the rows (and everything attached to them) in place. */
export async function remove({ origin = DEFAULT_ORIGIN, cookie, log = console.log }) {
  const { rows } = await call(origin, cookie, 'list_my_listings', {})
  const demos = rows.filter((row) => row.title.startsWith(DEMO_PREFIX) && row.status !== 'archived')
  for (const row of demos) {
    await call(origin, cookie, 'set_listing_status', { id: row.id, status: 'archived' })
    log(`archived  ${row.id}  ${row.title}`)
  }
  return { archived: demos.length }
}

async function main(argv, env) {
  const [mode] = argv
  if (mode === 'preview') {
    console.log(JSON.stringify(DEMO_LISTINGS.map(demoPayload), null, 2))
    return 0
  }
  if (mode !== 'load' && mode !== 'remove') {
    console.error('usage: node scripts/seed-demo.mjs <preview|load|remove>   (load and remove need PAS_COOKIE)')
    return 2
  }
  const cookie = env.PAS_COOKIE
  if (!cookie) {
    console.error('PAS_COOKIE is not set. Copy the Cookie header from your signed-in browser session (see the top of this file).')
    return 2
  }
  const origin = env.PAS_ORIGIN || DEFAULT_ORIGIN
  const summary = mode === 'load' ? await load({ origin, cookie }) : await remove({ origin, cookie })
  console.log(JSON.stringify(summary))
  return 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2), process.env).then(
    (code) => { process.exitCode = code },
    (error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 },
  )
}
