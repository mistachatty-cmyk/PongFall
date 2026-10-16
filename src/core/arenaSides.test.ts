import test from 'node:test'
import assert from 'node:assert/strict'
import { MAX_IMAGES, MAX_OBJECTS, MAX_SIGN_TEXT, SIDES_KEY, ceilingStops, cleanSignText, defaultSides, hslToHex, loadSides, matchLooks, mixHex, moveItem, npcLook, pickItem, saveSides, zonePoint, sanitizeLook, sanitizeSides } from './arenaSides'

test('defaults are neutral and survive junk input', () => {
  assert.deepEqual(sanitizeSides(null), defaultSides())
  assert.deepEqual(sanitizeSides('x'), defaultSides())
  assert.deepEqual(sanitizeSides({ sides: 5 }), defaultSides())
})

test('sanitize clamps numbers, drops unknown ids, kinds and patterns, and caps list sizes', () => {
  const look = sanitizeLook({
    hue: 9999, tint: -3, pattern: 'lava', filter: 'sepia', ceiling: 'mud',
    images: [{ id: 'eye-emblem', x: 7, y: -1, scale: 99, opacity: 0 }, { id: 'stolen-album', x: .5, y: .5 }, ...Array(10).fill({ id: 'tear-drop' })],
    objects: [{ kind: 'tree', x: .2 }, { kind: 'bomb' }, { kind: 'sign', text: '<b>hi!</b> ' + 'x'.repeat(80) }, ...Array(10).fill({ kind: 'lantern' })],
  })
  assert.equal(look.hue, 359); assert.equal(look.tint, 0); assert.equal(look.pattern, 'none'); assert.equal(look.filter, 'none'); assert.equal(look.ceiling, 'plain')
  assert.equal(look.images.length, MAX_IMAGES); assert.ok(look.images.every(i => i.id !== 'stolen-album'))
  assert.deepEqual(look.images[0], { id: 'eye-emblem', x: 1, y: 0, scale: 1.6, opacity: .1 })
  assert.equal(look.objects.length, MAX_OBJECTS); assert.ok(look.objects.every(o => o.kind !== ('bomb' as string)))
  const sign = look.objects.find(o => o.kind === 'sign')!
  assert.ok(sign.text!.length <= MAX_SIGN_TEXT); assert.ok(!/[<>]/.test(sign.text!))
})

test('sign text keeps letters, digits and gentle punctuation only', () => {
  assert.equal(cleanSignText('Hello, World! <script>'), 'Hello, World! script')
  assert.equal(cleanSignText(5), '')
})

test('look round-trips through storage and re-sanitizes on load', () => {
  const mem = new Map<string, string>()
  const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v) } }
  const s = defaultSides(); s.scope = 'whole'; s.sides[0].hue = 40; s.sides[0].images = [{ id: 'eye-emblem', x: .5, y: .5, scale: 1, opacity: .5 }]
  saveSides(s, storage)
  assert.deepEqual(loadSides(storage), s)
  mem.set(SIDES_KEY, '{bad json')
  assert.deepEqual(loadSides(storage), defaultSides())
})

test('matchLooks: own side stays mine, opponent is synced or an NPC preset, whole mirrors', () => {
  const own = defaultSides(); own.sides[0].hue = 10; own.sides[1].hue = 20
  const opp = sanitizeLook({ hue: 99 })
  assert.deepEqual(matchLooks(own, 0, opp, 0).map(l => l.hue), [10, 99])
  assert.deepEqual(matchLooks(own, 1, opp, 0).map(l => l.hue), [99, 20])
  assert.equal(matchLooks(own, 0, null, 2)[1].ceiling, npcLook(2).ceiling)
  own.scope = 'whole'
  assert.deepEqual(matchLooks(own, 0, opp, 0).map(l => l.hue), [10, 10])
})

test('npcLook is stable per seed and returns a copy', () => {
  assert.deepEqual(npcLook(1), npcLook(1))
  const a = npcLook(1); a.objects.push({ kind: 'tree', x: 0, y: 0, scale: 1 })
  assert.notEqual(npcLook(1).objects.length, a.objects.length)
})

test('colour math', () => {
  assert.equal(hslToHex(0, 1, .5), '#ff0000'); assert.equal(hslToHex(120, 1, .5), '#00ff00'); assert.equal(hslToHex(240, 1, .5), '#0000ff')
  assert.equal(mixHex('#000000', '#ffffff', .5), '#808080')
})

test('ceiling blend holds each side then crosses the centre', () => {
  const st = ceilingStops('frost', 'flame')
  assert.equal(st[0]!.at, 0); assert.equal(st[st.length - 1]!.at, 1)
  assert.deepEqual(st.map(s => s.at), [...st.map(s => s.at)].sort((a, b) => a - b))
  assert.ok(st.some(s => s.at === .5))
  assert.equal(ceilingStops('gold', 'gold').length, 2)
})

test('pointer placement maps arena points to zone coordinates, picks nearby items and moves them', () => {
  const W = 800, H = 400
  assert.deepEqual(zonePoint(-400, -200, W, H), { side: 0, x: 0, y: 0 })
  assert.deepEqual(zonePoint(400, 200, W, H), { side: 1, x: 1, y: 1 })
  assert.deepEqual(zonePoint(-200, 0, W, H), { side: 0, x: .5, y: .5 })
  assert.equal(zonePoint(9999, -9999, W, H).x, 1)
  const look = sanitizeLook({ images: [{ id: 'eye-emblem', x: .5, y: .5 }], objects: [{ kind: 'tree', x: .5, y: .5 }, { kind: 'lantern', x: .9, y: .1 }] })
  assert.deepEqual(pickItem(look, 0, -200, 0, W, H), { list: 'objects', index: 0 })   // the object wins over the picture under it
  assert.equal(pickItem(look, 0, -380, 190, W, H), null)
  assert.deepEqual(pickItem(look, 0, -40, -160, W, H), { list: 'objects', index: 1 })
  const moved = moveItem(look, { list: 'objects', index: 0 }, 2, -1)
  assert.deepEqual([moved.objects[0]!.x, moved.objects[0]!.y], [1, 0]); assert.equal(look.objects[0]!.x, .5)
})
