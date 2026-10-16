import test from 'node:test'
import assert from 'node:assert/strict'
import { percent, streakLabel, summarize } from './statsMath'
import type { HistoryEntry } from './cloudSync'

const e = (won: boolean, score: number, opp: number, mode = 'classic', broken = false): HistoryEntry => ({ id: String(Math.random()), mode, won, score, opponent_score: opp, played_at: '2026-01-01', details: { ownGlassBroken: broken } as HistoryEntry['details'] })

test('empty history gives zeros and no streak', () => {
  const s = summarize([])
  assert.deepEqual([s.falls, s.winRate, s.currentStreak, s.bestStreak, s.recent.length], [0, 0, 0, 0, 0])
  assert.equal(streakLabel(0), 'no falls yet')
})

test('streaks read newest first: current run and best run of wins', () => {
  // newest first: W W L W W W L
  const s = summarize([e(true, 14, 2), e(true, 14, 5), e(false, 3, 14), e(true, 14, 0), e(true, 14, 1), e(true, 14, 9), e(false, 1, 14)])
  assert.equal(s.currentStreak, 2); assert.equal(s.bestStreak, 3); assert.equal(s.wins, 5); assert.equal(s.losses, 2)
  assert.equal(summarize([e(false, 1, 14), e(false, 2, 14), e(true, 14, 1)]).currentStreak, -2)
  assert.equal(streakLabel(-1), '1 loss in a row'); assert.equal(streakLabel(3), '3 wins in a row')
})

test('flawless wins need a shutout and intact glass; margins and averages', () => {
  const s = summarize([e(true, 14, 0), e(true, 14, 0, 'classic', true), e(false, 2, 14)])
  assert.equal(s.flawless, 1); assert.equal(s.bestMargin, 14); assert.equal(Math.round(s.avgFor * 100) / 100, 10); assert.equal(percent(s.winRate), '67%')
})

test('per-mode lines sort by falls and the recent strip is oldest to newest, capped', () => {
  const s = summarize([e(true, 1, 0, 'timed'), e(false, 0, 1, 'classic'), e(true, 1, 0, 'classic'), e(true, 1, 0, 'classic')], 3)
  assert.deepEqual(s.byMode.map(m => [m.mode, m.falls, m.wins]), [['classic', 3, 2], ['timed', 1, 1]])
  assert.equal(s.recent.length, 3); assert.deepEqual(s.recent.map(r => r.mode), ['classic', 'classic', 'timed'])
})
