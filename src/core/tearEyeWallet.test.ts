import test from 'node:test'
import assert from 'node:assert/strict'
import { TEAR_IRIS_COLORS, painterColors, sanitizePainterSelection } from './pongPainter'
import { awardMatchTears, buyTearIris, emptyTearEyeWallet, loadTearEyeWallet, sanitizeTearEyeWallet, saveTearEyeWallet, TEAR_EYE_WALLET_KEY, TEARS_PER_IRIS } from './tearEyeWallet'

test('normal match tears fill the iris wallet; experimental runs grant no tear currency', () => {
  const earned = awardMatchTears(emptyTearEyeWallet(), 8)
  assert.deepEqual(earned, { tears: 8, owned: [] })
  assert.deepEqual(awardMatchTears(earned, 9, true), earned)
  assert.deepEqual(awardMatchTears(earned, -3), earned)
})

test('each iris costs ten tears once and appears with its chosen color', () => {
  const color = TEAR_IRIS_COLORS[0]!
  const purchase = buyTearIris({ tears: TEARS_PER_IRIS, owned: [] }, color.id)
  assert.equal(purchase.ok, true)
  assert.deepEqual(purchase.wallet, { tears: 0, owned: [color.id] })
  assert.equal(buyTearIris(purchase.wallet, color.id).reason, 'owned')
  assert.equal(buyTearIris(purchase.wallet, TEAR_IRIS_COLORS[1]!.id).reason, 'short')
  assert.deepEqual(sanitizePainterSelection({ eye: color.id }), { eye: color.id })
  assert.equal(painterColors({ eye: color.id }).eye, color.value)
})

test('iris wallet storage sanitizes unknown paints and survives reload', () => {
  const storage = new Map<string, string>()
  const io = { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) }
  assert.equal(saveTearEyeWallet({ tears: 23, owned: [TEAR_IRIS_COLORS[2]!.id] }, io), true)
  assert.deepEqual(loadTearEyeWallet(io), { tears: 23, owned: [TEAR_IRIS_COLORS[2]!.id] })
  assert.deepEqual(sanitizeTearEyeWallet({ tears: 12.8, owned: ['iris-mint', 'made-up'] }), { tears: 12, owned: ['iris-mint'] })
  assert.equal(TEAR_EYE_WALLET_KEY, 'pongfall.tearEyeWallet.v1')
})
