/**
 * Demo listings: the fixture that scripts/seed-demo.mjs loads must be accepted by the real write
 * guards, marked as demo, and free of real addresses and photos.
 *
 *   node --experimental-strip-types --no-warnings qa/demo-listings.mjs   (part of `pnpm test`)
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { DEMO_LISTINGS, DEMO_NOTE, DEMO_PREFIX, demoPayload } from '../scripts/seed-demo.mjs'
import { isCategory } from '../web/src/propertyTypes.ts'

const mcp = JSON.parse(readFileSync(fileURLToPath(new URL('../mcp.json', import.meta.url)), 'utf8'))
const createParams = Object.keys(mcp.tools.find((t) => t.name === 'create_listing').params)

const MELBOURNE_SUBURBS = ['Fitzroy', 'Brunswick', 'St Kilda', 'Richmond', 'Footscray', 'Carlton', 'Hawthorn', 'Preston', 'Docklands', 'Box Hill']
const isWhole = (n) => n === null || (Number.isInteger(n) && n >= 0)

assert.ok(DEMO_LISTINGS.length >= 10 && DEMO_LISTINGS.length <= 15, 'between 10 and 15 demo listings')
assert.equal(new Set(DEMO_LISTINGS.map((d) => d.slug)).size, DEMO_LISTINGS.length, 'every demo listing has its own slug')

const payloads = DEMO_LISTINGS.map(demoPayload)
assert.equal(new Set(payloads.map((p) => p.id)).size, payloads.length, 'every demo listing has its own id')

for (const p of payloads) {
  assert.ok(p.title.startsWith(DEMO_PREFIX), `${p.id}: the title is marked [Demo]`)
  assert.ok(p.description.startsWith(DEMO_NOTE), `${p.id}: the description says it is a demo`)
  assert.ok(!/https?:\/\//i.test(p.description + p.title), `${p.id}: no links in the copy`)
  assert.equal(p.images, '[]', `${p.id}: no photos`)
  assert.ok(MELBOURNE_SUBURBS.includes(p.suburb), `${p.id}: a Melbourne suburb`)
  assert.equal(p.location, `${p.suburb}, Melbourne`, `${p.id}: the location is the suburb, never a street`)
  assert.ok(isCategory(p.category), `${p.id}: a property-type category`)
  assert.ok(['per_week', 'sale'].includes(p.price_unit), `${p.id}: a rent or sale price unit`)
  assert.ok(Number.isFinite(p.price) && p.price > 0, `${p.id}: a positive price`)
  assert.ok(isWhole(p.bedrooms) && isWhole(p.bathrooms) && isWhole(p.car_spaces), `${p.id}: counts are whole and not negative, or unknown`)
  assert.ok(p.lat >= -38.5 && p.lat <= -37.4 && p.lng >= 144.5 && p.lng <= 145.5, `${p.id}: a pin inside metropolitan Melbourne`)
  for (const key of Object.keys(p)) assert.ok(createParams.includes(key), `${p.id}: ${key} is a create_listing parameter`)
}

const rent = payloads.filter((p) => p.price_unit === 'per_week').length
const sale = payloads.filter((p) => p.price_unit === 'sale').length
assert.ok(rent >= 3 && sale >= 3, 'a mix of weekly rentals and sales')
assert.ok(new Set(payloads.map((p) => p.category)).size >= 4, 'several property types')
assert.ok(new Set(payloads.map((p) => p.suburb)).size >= 8, 'spread across suburbs')
assert.ok(payloads.some((p) => p.bedrooms === null), 'at least one listing with no bedroom count, so the UI hides it')

console.log(`PASS  demo listings: ${payloads.length} marked, in Melbourne, with a valid payload shape`)
