/**
 * Request wording: every stored request status has a label, the labels are property words, and the
 * lifecycle the labels describe is still the one mcp.json enforces.
 *
 *   node --experimental-strip-types --no-warnings qa/request-wording.mjs   (part of `pnpm test`)
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { REQUEST, REQUEST_STATUS_LABEL, requestStatusLabel } from '../web/src/requestWording.ts'

const mcp = JSON.parse(readFileSync(fileURLToPath(new URL('../mcp.json', import.meta.url)), 'utf8'))
const sqlOf = (name) => mcp.tools.find((t) => t.name === name).sql

// The stored statuses are the quoted words in the request actions.
const stored = new Set()
for (const name of ['create_request', 'cancel_request', 'set_request_status']) {
  for (const [, word] of sqlOf(name).matchAll(/'([a-z_]+)'/g)) if (['pending', 'accepted', 'declined', 'completed', 'cancelled'].includes(word)) stored.add(word)
}
assert.deepEqual([...stored].sort(), Object.keys(REQUEST_STATUS_LABEL).sort(), 'every stored request status, and only those, has a label')

for (const [status, label] of Object.entries(REQUEST_STATUS_LABEL)) {
  assert.ok(label.trim().length > 0, `${status} has a label`)
  assert.ok(!/request/i.test(label), `${status} is not labelled with the generic word "request"`)
}
assert.equal(requestStatusLabel('pending'), 'New', 'a new request reads as New')
assert.equal(requestStatusLabel('accepted'), 'Inspection booked / In contact', 'an accepted request reads as booked or in contact')
assert.equal(requestStatusLabel('completed'), 'Closed', 'a completed request reads as Closed')
assert.equal(requestStatusLabel('cancelled'), 'Withdrawn', 'a cancelled request reads as Withdrawn')
assert.equal(requestStatusLabel('mystery'), 'mystery', 'an unknown status is shown as stored rather than hidden')

// The labels describe the lifecycle; they must not outrun it.
const transitions = sqlOf('set_request_status')
assert.ok(transitions.includes("(:from = 'pending' AND :to IN ('accepted', 'declined'))"), 'pending moves only to accepted or declined')
assert.ok(transitions.includes("(:from = 'accepted' AND :to IN ('completed', 'declined'))"), 'accepted moves only to completed or declined')
assert.ok(sqlOf('cancel_request').includes("status IN ('pending', 'accepted')"), 'only open requests can be withdrawn')

assert.equal(REQUEST.noun, 'enquiry', 'the seeker-facing noun is enquiry')
assert.equal(REQUEST.plural, 'enquiries', 'the plural is enquiries')
assert.equal(REQUEST.title, 'Enquiries', 'the title case is Enquiries')
assert.equal(REQUEST.verb, 'Enquire', 'the button verb is Enquire')
assert.equal(REQUEST.sent, 'Enquiry sent', 'the confirmation reads Enquiry sent')

console.log('PASS  request wording: every stored status is labelled and the lifecycle is unchanged')
