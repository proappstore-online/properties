/**
 * Map placement: what is sent to the geocoder, and what the owner's save gets back when the
 * address cannot be placed. A failed placement must never stop a listing from saving.
 *
 *   node --experimental-strip-types --no-warnings qa/map-placement.mjs   (part of `pnpm test`)
 */
import assert from 'node:assert/strict'
import { addressQuery, locate } from '../web/src/places.ts'

assert.equal(addressQuery('12 Smith St', 'Fitzroy'), '12 Smith St, Fitzroy, VIC, Australia', 'the query is the location and suburb, biased to Victoria')
assert.equal(addressQuery('', 'Fitzroy'), 'Fitzroy, VIC, Australia', 'a suburb alone is enough to place a listing')
assert.equal(addressQuery('  ', ' '), null, 'a blank address has nothing to place')
assert.equal(addressQuery(' 12 Smith St ', ''), '12 Smith St, VIC, Australia', 'surrounding spaces are trimmed')

const melbourne = { lat: -37.7985, lng: 144.9786, address: { country_code: 'au' } }
const query = 'Fitzroy, VIC, Australia'

let asked = 0
const counting = async (text) => { asked++; assert.equal(text, query); return [melbourne] }
assert.deepEqual(await locate(query, counting), { lat: -37.7985, lng: 144.9786 }, 'a match in Australia is placed')
assert.equal(asked, 1, 'the geocoder is asked once')

let neverAsked = 0
assert.equal(await locate(null, async () => { neverAsked++; return [melbourne] }), null, 'no address means no pin')
assert.equal(neverAsked, 0, 'no address means the geocoder is not called at all')

assert.equal(await locate(query, async () => []), null, 'no match: the save goes ahead without a pin')
assert.equal(await locate(query, async () => { throw new Error('maps.geocode failed: 503') }), null, 'a failed geocode request is not an error for the owner')
assert.equal(await locate(query, async () => [{ lat: -41.3, lng: 174.8, address: { country_code: 'nz' } }]), null, 'a match outside Australia is not used')
assert.equal(await locate(query, async () => [{ lat: Number.NaN, lng: 144.9, address: { country_code: 'au' } }]), null, 'unusable coordinates are not used')
assert.deepEqual(
  await locate(query, async () => [{ lat: -41.3, lng: 174.8, address: { country_code: 'nz' } }, melbourne]),
  { lat: -37.7985, lng: 144.9786 },
  'the first Australian match wins when the geocoder returns several',
)
assert.deepEqual(await locate(query, async () => [{ lat: -37.8, lng: 144.9 }]), { lat: -37.8, lng: 144.9 }, 'a match without a country is accepted')

console.log('PASS  map placement: the query is built, and every failure leaves the listing unpinned')
