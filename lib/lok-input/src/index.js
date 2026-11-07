/** LOK Input v1: browser-independent state machine; call poll once per frame. */
export const STANDARD_MAP = Object.freeze({
  confirm: { button: 0 }, back: { button: 1 }, primary: { button: 0 },
  secondary: { button: 2 }, previous: { button: 4 }, next: { button: 5 }, pause: { button: 9 },
});
const clamp = n => Number.isFinite(n) ? Math.max(-1, Math.min(1, n)) : 0;
export function deadzone(value, threshold = .2) {
  value = clamp(value); threshold = Number.isFinite(threshold) ? threshold : .2; threshold = Math.max(0, Math.min(.9, threshold));
  return Math.abs(value) <= threshold ? 0 : Math.sign(value) * (Math.abs(value) - threshold) / (1 - threshold);
}
const down = (pad, index) => Boolean(pad.buttons?.[index]?.pressed || pad.buttons?.[index]?.value > .5);
export function validMap(map) {
  return Boolean(map && typeof map === 'object' && !Array.isArray(map) && Object.keys(map).length <= 32 && Object.entries(map).every(([name, b]) =>
    /^[a-z][a-zA-Z0-9]{0,31}$/.test(name) && b && typeof b === 'object' &&
    ((Number.isInteger(b.button) && b.button >= 0 && b.button < 64) ||
     (Number.isInteger(b.axis) && b.axis >= 0 && b.axis < 16 && (b.direction === -1 || b.direction === 1)))));
}
function stick(x,y,threshold){
  x=clamp(x);y=clamp(y);const length=Math.hypot(x,y);
  if(!length)return [0,0];const scaled=deadzone(Math.min(1,length),threshold);
  return [x/length*scaled,y/length*scaled];
}
export class LokInput {
  constructor({ maxPlayers = 4, map = STANDARD_MAP, threshold = .2 } = {}) {
    if (!validMap(map)) throw new TypeError('Invalid action map');
    this.maxPlayers = Math.max(1, Math.min(4, Math.trunc(maxPlayers) || 1));
    this.map = { ...map }; this.threshold = threshold; this.slots = new Map();
    this.identities = new Map(); this.previous = new Map(); this.joinHeld = new Set(); this.blocked = new Set();
  }
  setMap(map) { if (!validMap(map)) throw new TypeError('Invalid action map'); this.map = { ...map }; this.reset(); }
  reset() { this.previous.clear(); for (const index of this.slots.keys()) this.blocked.add(index); }
  leave(player) {
    for (const [index, slot] of this.slots) if (slot === player) {
      this.slots.delete(index); this.identities.delete(index); this.previous.delete(index); this.blocked.delete(index);
    }
  }
  poll(gamepads, active = true) {
    const pads = Array.from(gamepads ?? []).filter(p => p && p.connected !== false);
    const live = new Set(pads.map(p => p.index));
    for (const [index] of this.slots) if (!live.has(index)) {
      this.slots.delete(index); this.identities.delete(index); this.previous.delete(index); this.blocked.delete(index);
    }
    for (const index of this.joinHeld) if (!live.has(index)) this.joinHeld.delete(index);
    if (!active) { this.reset(); return []; }
    const frames = [];
    for (const pad of pads) {
      if (this.identities.has(pad.index) && this.identities.get(pad.index) !== pad.id) this.leave(this.slots.get(pad.index));
      const join = down(pad, 0), wasJoin = this.joinHeld.has(pad.index);
      if (join) this.joinHeld.add(pad.index); else this.joinHeld.delete(pad.index);
      if (!this.slots.has(pad.index) && join && !wasJoin && this.slots.size < this.maxPlayers) {
        let player = 0; while ([...this.slots.values()].includes(player)) player++;
        this.slots.set(pad.index, player); this.identities.set(pad.index, pad.id); this.blocked.add(pad.index);
      }
      if (!this.slots.has(pad.index)) continue;
      const rawActions = Object.fromEntries(Object.entries(this.map).map(([action, b]) => [action,
        b.button !== undefined ? down(pad, b.button) : clamp(pad.axes?.[b.axis]) * b.direction > .5]));
      const dpad=[12,13,14,15].some(index=>down(pad,index));
      const [rawX,rawY]=dpad?stick(Number(down(pad,15))-Number(down(pad,14)),Number(down(pad,13))-Number(down(pad,12)),0):stick(pad.axes?.[0],pad.axes?.[1],this.threshold);
      const look=stick(pad.axes?.[2],pad.axes?.[3],this.threshold);
      if (this.blocked.has(pad.index) && !Object.values(rawActions).some(Boolean) && !rawX && !rawY && !deadzone(pad.axes?.[2], this.threshold) && !deadzone(pad.axes?.[3], this.threshold)) this.blocked.delete(pad.index);
      const blocked = this.blocked.has(pad.index);
      const actions = Object.fromEntries(Object.entries(rawActions).map(([k,v]) => [k, blocked ? false : v]));
      const previous = this.previous.get(pad.index) ?? {};
      const pressed = Object.fromEntries(Object.entries(actions).map(([k,v]) => [k, v && !previous[k]]));
      const released = Object.fromEntries(Object.entries(actions).map(([k,v]) => [k, !v && Boolean(previous[k])]));
      this.previous.set(pad.index, actions);
      frames.push({ player: this.slots.get(pad.index), index: pad.index, mapping: pad.mapping ?? '',
        move: [blocked ? 0 : rawX, blocked ? 0 : rawY],
        look: blocked ? [0,0] : look, actions, pressed, released });
    }
    return frames.sort((a,b) => a.player - b.player);
  }
}
export function readGamepads(nav = globalThis.navigator) {
  try {
    if (!nav?.getGamepads) return { pads: [], status: 'unsupported' };
    return { pads: Array.from(nav.getGamepads()).filter(Boolean), status: 'available' };
  } catch { return { pads: [], status: 'blocked' }; }
}
export function loadMap(storage, app, fallback = STANDARD_MAP) {
  try { const map = JSON.parse(storage.getItem('lok:input:v1:' + app)); return validMap(map) ? map : fallback; } catch { return fallback; }
}
export function saveMap(storage, app, map) {
  if (!validMap(map)) return false;
  try { storage.setItem('lok:input:v1:' + app, JSON.stringify(map)); return true; } catch { return false; }
}
/** Navigation acts only inside a caller-owned surface. Pass zero to release. */
export class MenuRepeat {
  constructor() { this.direction = ''; this.nextAt = 0; }
  step(move, now) {
    const direction = Math.abs(move[0]) > Math.abs(move[1]) ? (move[0] > .5 ? 'right' : move[0] < -.5 ? 'left' : '') : (move[1] > .5 ? 'down' : move[1] < -.5 ? 'up' : '');
    if (!direction) { this.direction = ''; return ''; }
    if (direction !== this.direction) { this.direction = direction; this.nextAt = now + 350; return direction; }
    if (now < this.nextAt) return ''; this.nextAt = now + 120; return direction;
  }
}
export function canvasSize(width, height, quality = 'balanced') {
  const cap = quality === 'potato' ? 960 : quality === 'lock' ? 1920 : 1280;
  const w = Math.max(1, Number.isFinite(width) ? width : 1), h = Math.max(1, Number.isFinite(height) ? height : 1);
  const scale = Math.min(1, cap / Math.max(w,h));
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}
