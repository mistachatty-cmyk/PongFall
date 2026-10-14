// Exports the existing GSix CSS ad without redrawing it. Requires Chrome and ffmpeg.
// Run from anywhere: node promo/pongfall-ad/render.mjs
import { spawn, execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const temporary = mkdtempSync(join(tmpdir(), 'pongfall-original-ad-'))
const profile = join(temporary, 'chrome-profile')
const frames = join(temporary, 'frames')
const { mkdirSync } = await import('node:fs')
mkdirSync(frames)

const chrome = spawn(chromePath, [
  '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
  '--disable-extensions', '--hide-scrollbars', '--remote-debugging-port=0',
  `--user-data-dir=${profile}`, 'about:blank',
], { windowsHide: true, stdio: 'ignore' })

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
async function waitForPort() {
  const path = join(profile, 'DevToolsActivePort')
  for (let i = 0; i < 100; i++) {
    if (existsSync(path)) return Number(readFileSync(path, 'utf8').split('\n')[0])
    if (chrome.exitCode !== null) throw new Error(`Chrome exited: ${chrome.exitCode}`)
    await delay(100)
  }
  throw new Error('Chrome did not start its debugging endpoint')
}

let socket
try {
  const port = await waitForPort()
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  const target = targets.find(item => item.type === 'page')
  if (!target) throw new Error('Chrome did not open a page')
  socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }) })
  let nextId = 1
  const pending = new Map()
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data)
    if (!message.id) return
    const entry = pending.get(message.id)
    if (!entry) return
    pending.delete(message.id)
    message.error ? entry.reject(new Error(JSON.stringify(message.error))) : entry.resolve(message.result)
  })
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = nextId++
    pending.set(id, { resolve, reject })
    socket.send(JSON.stringify({ id, method, params }))
  })
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 960, height: 540, deviceScaleFactor: 1, mobile: false })
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })
  await send('Page.navigate', { url: pathToFileURL(join(here, 'index.html')).href })
  for (let i = 0; i < 40; i++) {
    const state = await send('Runtime.evaluate', { expression: 'document.readyState', returnByValue: true })
    if (state.result.value === 'complete') break
    await delay(100)
  }

  const fps = 12, count = 96
  for (let i = 0; i < count; i++) {
    // Starting at 2s gives the animated cover a readable first frame. The
    // eight-second wordmark cycle still plays in full, exactly as on GSix.
    const time = 2000 + i * 1000 / fps
    const action = `(() => { const a = document.getAnimations({subtree:true}); for (const item of a) { item.pause(); item.currentTime=${time}; } return a.length })()`
    const result = await send('Runtime.evaluate', { expression: action, returnByValue: true })
    if (!result.result.value) throw new Error('The source ad has no CSS animations')
    const png = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true })
    writeFileSync(join(frames, `frame-${String(i).padStart(3, '0')}.png`), Buffer.from(png.data, 'base64'))
  }

  // A still from the source's own reduced-motion mode is useful in places
  // where animation is disabled or the first GIF frame is not displayed.
  await send('Page.navigate', { url: pathToFileURL(join(here, 'index.html')).href + '?still=1' })
  await delay(250)
  const still = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true })
  writeFileSync(join(here, 'pongfall-ad-still.png'), Buffer.from(still.data, 'base64'))

  const input = join(frames, 'frame-%03d.png')
  const palette = join(temporary, 'palette.png')
  const gif = join(here, 'pongfall-ad-original.gif')
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', String(fps), '-i', input, '-vf', 'palettegen=max_colors=160:stats_mode=diff', palette])
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', String(fps), '-i', input, '-i', palette, '-lavfi', 'paletteuse=dither=bayer:bayer_scale=3', '-loop', '0', gif])

  // Itch cover art uses 315:250; letterbox the original 16:9 animation so
  // no words or wall eyes are cut off. This is the same ad, only resized.
  const coverFrames = join(temporary, 'cover')
  mkdirSync(coverFrames)
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', String(fps), '-i', input,
    '-vf', 'scale=630:354:flags=lanczos,pad=630:500:0:73:color=0x070a12', join(coverFrames, 'frame-%03d.png')])
  const coverPalette = join(temporary, 'cover-palette.png')
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', String(fps), '-i', join(coverFrames, 'frame-%03d.png'), '-vf', 'palettegen=max_colors=160:stats_mode=diff', coverPalette])
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', String(fps), '-i', join(coverFrames, 'frame-%03d.png'), '-i', coverPalette, '-lavfi', 'paletteuse=dither=bayer:bayer_scale=3', '-loop', '0', join(here, 'pongfall-itch-cover-original.gif')])
  console.log('Rendered original GSix ad:', readdirSync(here).filter(name => /\.(gif|png)$/.test(name)).join(', '))
} finally {
  socket?.close()
  if (process.platform === 'win32' && chrome.pid) {
    try { execFileSync('taskkill', ['/PID', String(chrome.pid), '/T', '/F'], { stdio: 'ignore' }) }
    catch { chrome.kill() }
  } else chrome.kill()
  await delay(500)
  const tempRoot = resolve(tmpdir()) + sep
  if (!resolve(temporary).startsWith(tempRoot)) throw new Error('Refusing to remove a directory outside the system temp folder')
  rmSync(temporary, { recursive: true, force: true, maxRetries: 15, retryDelay: 200 })
}
