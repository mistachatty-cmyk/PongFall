import test from 'node:test'
import assert from 'node:assert/strict'
import { FRAME_STYLES, drawArenaFrame, parseFrame, type FrameStyle } from './arenaFrame'
import { ALL_PAINTER_ITEMS, PAINTER_EARNED, PAINTER_SLOTS, painterColors, painterUnlocked, productSlot } from '../core/pongPainter'

const stub = (): CanvasRenderingContext2D => { const fn: unknown = new Proxy(function () { /* noop */ }, { get: (_t, k) => k === Symbol.toPrimitive ? () => 0 : stub(), set: () => true, apply: () => stub() }); return fn as CanvasRenderingContext2D }

test('frame values parse: style:colour, plain colour (line), the starter blue means none, junk is ignored', () => {
  assert.deepEqual(parseFrame('foundry:#ffbd72'), { style: 'foundry', color: '#ffbd72' })
  assert.deepEqual(parseFrame('#a8b9ff'), { style: 'line', color: '#a8b9ff' })
  assert.equal(parseFrame('#4aa8ff'), null); assert.equal(parseFrame(undefined), null); assert.equal(parseFrame('lava:#ffffff'), null); assert.equal(parseFrame('neon:red'), null)
})
test('every frame style draws at any size, time and reduced motion without throwing', () => {
  for (const style of FRAME_STYLES) for (const [W, H] of [[640, 400], [1024, 540]] as const) for (const t of [0, 1.7, 99]) for (const reduce of [false, true]) drawArenaFrame(stub(), W, H, { style: style as FrameStyle, color: '#44ccff' }, t, reduce)
})
test('every earned look is well formed, every slot has several options, and each arena frame item resolves to a real style', () => {
  const ids = ALL_PAINTER_ITEMS.map(i => `${i.category}.${i.id}`); assert.equal(new Set(ids).size, ids.length)
  for (const it of PAINTER_EARNED) { assert.ok(it.unlock && (it.unlock.falls ?? it.unlock.wins ?? 0) > 0 && it.price === 0, it.id); assert.ok(it.value.length > 1, it.id) }
  for (const slot of PAINTER_SLOTS.filter(s => s.id !== 'eye.pupil')) assert.ok(ALL_PAINTER_ITEMS.filter(i => productSlot(i) === slot.id).length >= 2, `${slot.id} has too few options`)
  const styles = new Set(ALL_PAINTER_ITEMS.filter(i => productSlot(i) === 'arena.frame').map(i => parseFrame(i.value)?.style)); assert.ok(styles.size >= 10, `${styles.size} frame styles`)
  assert.equal(painterUnlocked(PAINTER_EARNED[0]!, { falls: 0, wins: 0 }), false)
  const neon = PAINTER_EARNED.find(i => i.id === 'neon-tube')!; assert.equal(painterColors({ 'arena.frame': 'neon-tube' }).slots['arena.frame'], neon.value)
})
