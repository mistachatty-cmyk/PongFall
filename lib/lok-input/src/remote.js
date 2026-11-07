/** Receives input only from a data channel that the host has approved. Pairing/auth is the caller's job. */
export class RemotePad {
  constructor({index=1000,timeout=500,maxHz=30}={}) {
    this.index=index;this.timeout=timeout;this.interval=1000/maxHz;this.lastSequence=-1;this.lastAt=-Infinity;this.lastAcceptedAt=-Infinity;this.state=null;
  }
  receive(packet, now) {
    if(!packet || packet.version!==1 || !Number.isSafeInteger(packet.sequence) || packet.sequence<0 || packet.sequence<=this.lastSequence || !Number.isFinite(now))return false;
    if(!Array.isArray(packet.axes) || packet.axes.length!==4 || !packet.axes.every(n=>Number.isFinite(n)&&n>=-1&&n<=1))return false;
    if(!Array.isArray(packet.buttons)||packet.buttons.length!==17||!packet.buttons.every(b=>typeof b==='boolean'))return false;
    if(now-this.lastAcceptedAt<this.interval)return false;
    this.lastSequence=packet.sequence;this.lastAt=now;this.lastAcceptedAt=now;
    this.state={axes:[...packet.axes],buttons:[...packet.buttons]};return true;
  }
  snapshot(now) {
    if(!this.state || now-this.lastAt>this.timeout || now<this.lastAt)return null;
    return {index:this.index,id:`LOK remote ${this.index}`,connected:true,mapping:'standard',axes:this.state.axes,
      buttons:this.state.buttons.map(pressed=>({pressed,value:pressed?1:0,touched:pressed})),timestamp:this.lastAt};
  }
  release() { this.state=null; }
}
/** A private, host-approved RTCDataChannel. Never bind a public Broadcast channel here. */
export function bindRemotePad(channel,pad,now=()=>performance.now()) {
  const message=e=>{
    if(typeof e.data!=='string'||e.data.length>512)return;
    try{pad.receive(JSON.parse(e.data),now())}catch{}
  };
  const release=()=>pad.release();channel.addEventListener('message',message);channel.addEventListener('close',release);channel.addEventListener('error',release);
  return ()=>{channel.removeEventListener('message',message);channel.removeEventListener('close',release);channel.removeEventListener('error',release);release()};
}
/** Snapshot sender; caller drives it at <=30Hz and sends a heartbeat even when neutral. */
export function createRemoteSender(channel) {
  let sequence=0,lastAt=-Infinity;
  return (axes,buttons,now)=>{
    if(channel.readyState!=='open'||channel.bufferedAmount>4096||now-lastAt<1000/30)return false;
    const packet={version:1,sequence:sequence++,axes,buttons};
    if(!Array.isArray(axes)||axes.length!==4||!axes.every(n=>Number.isFinite(n)&&Math.abs(n)<=1)||!Array.isArray(buttons)||buttons.length!==17||!buttons.every(b=>typeof b==='boolean'))return false;
    try{channel.send(JSON.stringify(packet));lastAt=now;return true}catch{return false}
  };
}
