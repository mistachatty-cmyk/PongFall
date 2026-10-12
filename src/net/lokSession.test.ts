import test from 'node:test'
import assert from 'node:assert/strict'
import { arcadeReturnUrl, LokSessionAdapter } from './lokSession'

test('Hub return only accepts a same-site path and always uses the GSix origin', () => {
  assert.equal(arcadeReturnUrl('/games/pongfall'), 'https://gsix.online/games/pongfall?signedin=pongfall')
  for (const path of ['https://evil.test/', '//evil.test/path', '/path?next=evil', '/path#fragment', null]) {
    assert.equal(arcadeReturnUrl(path), null)
  }
})

test('shared account storage safely no-ops when browser cookies are unavailable', async () => {
  const storage = new LokSessionAdapter()
  assert.equal(await storage.getItem('sb-project-auth-token'), null)
  await storage.setItem('sb-project-auth-token', 'session')
  await storage.removeItem('sb-project-auth-token')
})

test('LOK account sessions use the shared parent cookie and can be removed on sign-out', async () => {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  const cookies = new Map<string, string>()
  const local = new Map<string, string>()
  let written = ''
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    location: { hostname: 'pongfall.gsix.online', protocol: 'https:' },
    localStorage: { getItem: (key: string) => local.get(key) ?? null, setItem: (key: string, value: string) => local.set(key, value), removeItem: (key: string) => local.delete(key) },
  } })
  Object.defineProperty(globalThis, 'document', { configurable: true, value: Object.defineProperty({}, 'cookie', {
    configurable: true,
    get: () => [...cookies].map(([key, value]) => `${key}=${value}`).join('; '),
    set: (line: string) => {
      written = line
      const [pair, ...attrs] = line.split(';')
      const sep = pair!.indexOf('=')
      const key = pair!.slice(0, sep), value = pair!.slice(sep + 1)
      if (attrs.some(attr => attr.trim().toLowerCase() === 'max-age=0')) cookies.delete(key)
      else cookies.set(key, value)
    },
  }) })
  try {
    const storage = new LokSessionAdapter()
    const key = 'sb-shared-auth-token'
    const raw = JSON.stringify({ access_token: 'access', refresh_token: 'refresh', user: { id: 'u1', email: 'player@example.test', user_metadata: { name: 'Player', extra: 'x'.repeat(5000) } } })
    await storage.setItem(key, raw)
    assert.match(written, /Domain=\.gsix\.online/)
    assert.equal(local.has(key), false)
    const stored = JSON.parse((await storage.getItem(key))!)
    assert.equal(stored.access_token, 'access')
    assert.equal(stored.refresh_token, 'refresh')
    assert.equal(stored.user.email, 'player@example.test')
    assert.equal(stored.user.user_metadata.extra, undefined)
    await storage.removeItem(key)
    assert.equal(await storage.getItem(key), null)
  } finally {
    if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow); else Reflect.deleteProperty(globalThis, 'window')
    if (oldDocument) Object.defineProperty(globalThis, 'document', oldDocument); else Reflect.deleteProperty(globalThis, 'document')
  }
})
