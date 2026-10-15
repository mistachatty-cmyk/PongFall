import test from 'node:test'
import assert from 'node:assert/strict'
import { endMotion } from './endMotion'

const base = { over: true, stopped: false, holding: false, reduce: false, now: 10_000, plungeAt: 0 }

test('the arena hangs while the choice is open, then plunges faster and faster', () => {
  assert.deepEqual(endMotion({ ...base, holding: true }), { offset: 0, plungeAt: 0, plunging: false })
  const a = endMotion(base)
  assert.equal(a.offset, 0); assert.equal(a.plungeAt, 10_000); assert.ok(a.plunging)
  const b = endMotion({ ...base, now: 11_000, plungeAt: a.plungeAt }), c = endMotion({ ...base, now: 12_000, plungeAt: a.plungeAt })
  assert.equal(b.offset, 140); assert.equal(c.offset, 560)
})

test('a stopped fall, a running match and reduced motion never plunge the arena', () => {
  assert.equal(endMotion({ ...base, stopped: true, now: 15_000, plungeAt: 10_000 }).offset, 0)
  assert.equal(endMotion({ ...base, over: false }).plunging, false)
  assert.equal(endMotion({ ...base, reduce: true, now: 15_000, plungeAt: 10_000 }).offset, 0)
})
