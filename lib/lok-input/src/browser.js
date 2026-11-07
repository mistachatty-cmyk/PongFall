import { LokInput, MenuRepeat, readGamepads } from './index.js';
export function isEditing(element) {
  return Boolean(element?.closest?.('input:not([type=button]):not([type=checkbox]):not([type=radio]),textarea,select,[contenteditable=true],[role=textbox]'));
}
export function focusable(root) {
  return [...root.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex]')].filter(el =>
    !el.disabled && el.tabIndex >= 0 && !el.closest('[inert],[hidden],[aria-hidden=true]') && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
}
export function navigate(root, direction) {
  const items = focusable(root); if (!items.length) return;
  const current = document.activeElement;
  if (!items.includes(current)) { items[0].focus(); return; }
  const a = current.getBoundingClientRect(), ax = a.x + a.width / 2, ay = a.y + a.height / 2;
  const horizontal = direction === 'left' || direction === 'right', sign = direction === 'left' || direction === 'up' ? -1 : 1;
  const candidates = items.filter(el => el !== current).map(el => {
    const b = el.getBoundingClientRect(), dx = b.x+b.width/2-ax, dy = b.y+b.height/2-ay;
    const forward = (horizontal ? dx : dy)*sign, cross = Math.abs(horizontal ? dy : dx);
    return {el,forward,score:forward+cross*3};
  }).filter(c => c.forward > 2).sort((a,b) => a.score-b.score);
  const target=candidates[0]?.el;if(target) { target.focus(); target.scrollIntoView({block:'nearest',inline:'nearest'}); }
}
/** Exactly one owner: onFrame receives neutral [] immediately on blur and teardown. */
export function startInput({ input = new LokInput(), active = () => true, onFrame, onStatus = () => {} }) {
  let raf = 0, stopped = false, lastStatus = '';
  const neutral = () => { input.reset(); onFrame([], performance.now()); };
  const tick = now => {
    if (stopped) return;
    const result = readGamepads();
    if(result.status !== lastStatus) { onStatus(result.status); lastStatus=result.status; }
    const owns = !document.hidden && document.hasFocus() && active();
    onFrame(input.poll(result.pads, owns), now);
    raf = requestAnimationFrame(tick);
  };
  const visibility = () => { if(document.hidden) neutral(); };
  window.addEventListener('blur',neutral);document.addEventListener('visibilitychange',visibility);
  raf=requestAnimationFrame(tick);
  return () => { stopped=true;cancelAnimationFrame(raf);window.removeEventListener('blur',neutral);document.removeEventListener('visibilitychange',visibility);neutral(); };
}
export function startMenuNavigation(root, { active = () => true, onBack = () => {}, input = new LokInput({maxPlayers:1}) } = {}) {
  const repeat = new MenuRepeat();
  return startInput({input,active:()=>active() && (!isEditing(document.activeElement) || document.activeElement?.matches('select,input[type=range]')) && document.activeElement?.tagName !== 'IFRAME',onFrame(frames,now){
    const frame=frames[0];const direction=repeat.step(frame?.move ?? [0,0],now);
    const el=document.activeElement;
    if(direction && (direction==='left' || direction==='right') && el && root.contains(el) && el.matches('select,input[type=range]')){
      const delta=direction==='right'?1:-1;
      if(el.tagName==='SELECT')el.selectedIndex=Math.max(0,Math.min(el.options.length-1,el.selectedIndex+delta));
      else el.value=String(Math.max(Number(el.min||0),Math.min(Number(el.max||100),Number(el.value)+delta*Number(el.step||1))));
      el.dispatchEvent(new Event('change',{bubbles:true}));el.dispatchEvent(new Event('input',{bubbles:true}));
    } else if(direction) navigate(root,direction);
    if(frame?.pressed.confirm){const el=document.activeElement;if(el && root.contains(el) && focusable(root).includes(el)) el.click();else focusable(root)[0]?.focus();}
    if(frame?.pressed.back)onBack();
  }});
}
/** Optional bridge for older keyboard engines. Only verified app bindings go here. */
export function keyboardAdapter(bindings, target = globalThis.window) {
  let held=new Map();
  const emit=(type,b)=>target.dispatchEvent(new KeyboardEvent(type,{key:b.key,code:b.code,bubbles:true,cancelable:true}));
  const update=frames=>{
    const next=new Map();
    for(const frame of frames){const map=bindings[frame.player];if(!map)continue;
      for(const [action,b] of Object.entries(map)){
        const down= action==='up' ? frame.move[1]<-.3 : action==='down' ? frame.move[1]>.3 : action==='left' ? frame.move[0]<-.3 : action==='right' ? frame.move[0]>.3 : frame.actions[action];
        if(down)next.set(b.code,b);
      }
    }
    for(const [code,b] of held)if(!next.has(code))emit('keyup',b);
    for(const [code,b] of next)if(!held.has(code))emit('keydown',b);
    held=next;
  };
  return {update,release:()=>update([])};
}
