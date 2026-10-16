import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
const it = test
import { awardPack, craftItem, emptyLokPack, openPack, packKindFor, rollPack, sanitizeLokPack, CT_CRAFT, PITY_EPIC, PITY_LEGENDARY, PACK_KINDS } from './lokPack'
import { PACK_ITEMS, RARITIES, packItemById } from './packItems'

const won = { mode: 'solo-fall', durationMs: 60000, won: true, overtime: false }
describe('LokPack rules', () => {
  it('pays a streak bonus from the third day in a row, once a day', () => {
    const day = (n: number) => new Date(2026, 9, 1 + n, 12).getTime()
    let s = emptyLokPack()
    for (let d = 0; d < 4; d++) { const a = awardPack(s, `d${d}a`, won, day(d)); s = a.save; if (d === 3) assert.equal(s.ct, 20); const b = awardPack(s, `d${d}b`, won, day(d) + 1000); assert.equal(b.save.ct, s.ct); s = b.save }
    assert.equal(s.streak, 4)
    const gap = awardPack(s, 'gap', won, day(9)); assert.equal(gap.save.streak, 1)
  })
  it('earns packs only for real matches', () => {
    assert.equal(packKindFor(won), 'win')
    assert.equal(packKindFor({ ...won, won: false }), 'fall')
    assert.equal(packKindFor({ ...won, overtime: true }), 'cost')
    assert.equal(packKindFor({ ...won, mode: 'sandbox' }), null)
    assert.equal(packKindFor({ ...won, durationMs: 5000 }), null)
    assert.equal(packKindFor({ ...won, experimental: true }), null)
  })
  it('awards once per match', () => {
    const a = awardPack(emptyLokPack(), 'm1', won, 1), b = awardPack(a.save, 'm1', won, 2)
    assert.ok(a.pack); assert.equal(b.pack, null); assert.equal(b.save.packs.length, 1)
  })
  it('rolls are deterministic and sized by pack kind', () => {
    for (const kind of Object.keys(PACK_KINDS) as (keyof typeof PACK_KINDS)[]) {
      const a = rollPack({ kind, seed: 7 }, new Set(), 0, 0), b = rollPack({ kind, seed: 7 }, new Set(), 0, 0)
      assert.deepEqual(a, b); assert.equal(a.rewards.length, PACK_KINDS[kind].cards)
    }
  })
  it('opening adds items, never LokTokens, and converts duplicates to CT', () => {
    let s = awardPack(emptyLokPack(), 'm1', won, 1).save
    const first = openPack(s, 'm1', 2)!
    assert.equal(first.save.packs.filter(p => p.id === 'm1').length, 0)
    for (const r of first.rewards) assert.ok(['item', 'ct', 'pack'].includes(r.type))
    s = { ...first.save, items: PACK_ITEMS.map(i => i.id) }
    const again = openPack({ ...s, packs: [{ id: 'z', kind: 'win', seed: 3, at: 1 }] }, 'z', 3)!
    assert.equal(again.save.items.length, PACK_ITEMS.length)
    assert.ok(again.rewards.filter(r => r.type === 'item').every(r => r.type === 'item' && r.dup))
    assert.ok(again.save.ct > 0)
  })
  it('pity guarantees an epic and a legendary', () => {
    for (let seed = 1; seed < 40; seed++) {
      assert.ok(rollPack({ kind: 'fall', seed }, new Set(), PITY_EPIC - 1, 0).rewards.some(r => r.rarity === 'epic' || r.rarity === 'legendary'))
      assert.ok(rollPack({ kind: 'fall', seed }, new Set(), 0, PITY_LEGENDARY - 1).rewards.some(r => r.rarity === 'legendary'))
    }
  })
  it('crafting spends CT on a look you lack', () => {
    const s = { ...emptyLokPack(), ct: 1000 }
    const done = craftItem(s, 'storm-frame')
    assert.ok(done.ok); assert.equal(done.save.ct, 1000 - CT_CRAFT.legendary); assert.ok(done.save.items.includes('storm-frame'))
    assert.equal(craftItem(done.save, 'storm-frame').ok, false)
    assert.equal(craftItem(emptyLokPack(), 'storm-frame').ok, false)
  })
  it('every rarity has cards and ids are unique', () => {
    for (const r of RARITIES) assert.ok(PACK_ITEMS.some(i => i.rarity === r))
    assert.equal(new Set(PACK_ITEMS.map(i => i.id)).size, PACK_ITEMS.length)
    assert.equal(packItemById('aurora-frame')?.animated, true)
  })
  it('sanitizes a damaged save', () => {
    const s = sanitizeLokPack({ items: ['storm-frame', 'nope', 3], ct: -5, packs: [{ id: 'a', kind: 'bad' }, { id: 'b', kind: 'win', seed: 1, at: 2 }], ledger: 'x' })
    assert.deepEqual(s.items, ['storm-frame']); assert.equal(s.ct, 0); assert.equal(s.packs.length, 1)
  })
})
