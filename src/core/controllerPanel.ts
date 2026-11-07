import { LokInput, loadMap, saveMap, type ActionMap } from '../../lib/lok-input/src/index.js'
export const PONG_MAP: ActionMap = { thrust: {button:0}, power: {button:2}, flipUp: {button:6}, flipDown: {button:7}, tiltL: {button:4}, tiltR: {button:5}, zoom: {button:3}, pause: {button:9}, controls: {button:8} }
export function controllerMap(): ActionMap {
  try { return {...PONG_MAP,...loadMap(localStorage,'pongfall',PONG_MAP)} } catch { return {...PONG_MAP} }
}
export function createControllerPanel(host: HTMLElement, input: LokInput, onToggle: (open:boolean)=>void) {
  const root=document.createElement('details');root.style.cssText='position:absolute;right:12px;top:52px;z-index:20;color:#e8f1ff;background:#10151f;border:1px solid #586678;border-radius:8px;max-width:calc(100% - 24px);font:14px system-ui'
  const summary=document.createElement('summary');summary.textContent='Gamepads';summary.style.cssText='padding:10px 14px;cursor:pointer';root.append(summary)
  const body=document.createElement('div');body.style.cssText='padding:12px;max-height:55vh;overflow:auto;width:260px;box-sizing:border-box;max-width:100%';root.append(body)
  const help=document.createElement('p');help.textContent='Press A / Cross on each controller to join, then release. Player 2 controls the right paddle in Local 2-player. Xbox Edge: hold Menu to switch game controls. Movement: left stick / D-pad.';body.append(help)
  const status=document.createElement('p');status.setAttribute('role','status');body.append(status)
  let map=controllerMap()
  const save=()=>{input.setMap(map);let persisted=false;try{persisted=saveMap(localStorage,'pongfall',map)}catch{}status.textContent=persisted?'Saved on this device':'Applied for this session; storage unavailable'}
  for(const action of Object.keys(PONG_MAP)){
    const label=document.createElement('label');label.style.cssText='display:flex;justify-content:space-between;gap:12px;margin:8px 0';label.append(action)
    const select=document.createElement('select');select.setAttribute('aria-label',action+' controller button')
    for(let i=0;i<17;i++){const option=document.createElement('option');option.value=String(i);option.textContent=`Button ${i}`;select.append(option)}
    select.value=String(map[action]?.button ?? PONG_MAP[action]!.button);select.onchange=()=>{map={...map,[action]:{button:Number(select.value)}};save()};label.append(select);body.append(label)
  }
  const close=document.createElement('button');close.textContent='Return to game';close.style.cssText='padding:10px;margin-top:10px';close.onclick=()=>{root.open=false};body.append(close)
  root.addEventListener('toggle',()=>{input.reset();onToggle(root.open)})
  host.append(root)
  return { isOpen:()=>root.open, open:()=>{root.open=true}, close:()=>{root.open=false}, destroy:()=>root.remove() }
}
