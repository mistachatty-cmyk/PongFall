import test from 'node:test'
import assert from 'node:assert/strict'
import { MENU_LINES, lineAt } from './menuLines'

test('menu lines are distinct, sized for a footer, and step without repeating back to back', () => {
  assert.ok(MENU_LINES.length >= 16 && new Set(MENU_LINES).size === MENU_LINES.length)
  assert.ok(MENU_LINES.every(l => l.length > 12 && l.length < 80))
  for (let i = 0; i < 100; i++) assert.notEqual(lineAt(i * 9000), lineAt((i + 1) * 9000))
  assert.equal(lineAt(1234), lineAt(1999))
  assert.ok(!MENU_LINES.some(l => /signal/i.test(l)))
})
