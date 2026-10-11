/**
 * Property types: the slugs the owner form offers are the slugs the write actions accept,
 * each has its label, and anything retired reads as "Other".
 *
 *   node --experimental-strip-types --no-warnings qa/property-types.mjs   (part of `pnpm test`)
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { CATEGORIES, categoryLabel, isCategory } from '../web/src/propertyTypes.ts'

const mcp = JSON.parse(readFileSync(fileURLToPath(new URL('../mcp.json', import.meta.url)), 'utf8'))
const sqlOf = (name) => mcp.tools.find((t) => t.name === name).sql

/** The slugs a write action's `:category IN (...)` guard accepts, in order. */
const guardedSlugs = (sql) => {
  const match = sql.match(/:category IN \(([^)]*)\)/)
  assert.ok(match, 'the write action guards category')
  return match[1].split(',').map((s) => s.trim().slice(1, -1))
}

const slugs = CATEGORIES.map((c) => c.value)
assert.equal(new Set(slugs).size, slugs.length, 'every property-type slug is unique')
assert.deepEqual(CATEGORIES.map((c) => c.label), ['House', 'Apartment / Unit', 'Townhouse', 'Studio', 'Room / Share', 'Land', 'Other'], 'the labels are the agreed property types')
assert.deepEqual(guardedSlugs(sqlOf('create_listing')), slugs, 'create_listing accepts exactly the property-type slugs')
assert.deepEqual(guardedSlugs(sqlOf('update_listing')), slugs, 'update_listing accepts exactly the property-type slugs')
assert.equal(categoryLabel('apartment'), 'Apartment / Unit', 'a stored slug shows its label')
assert.equal(categoryLabel('room'), 'Other', 'a retired marketplace category falls back to Other')
assert.equal(categoryLabel(''), 'Other', 'a listing with no category falls back to Other')
assert.ok(isCategory('land') && !isCategory('vehicle'), 'the type guard accepts property types only')

console.log('PASS  property types: labels, fallback and write guard use the same slugs')
