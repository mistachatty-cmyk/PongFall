export interface RemotePacket {version:1;sequence:number;axes:number[];buttons:boolean[]}
export class RemotePad {
 constructor(options?:{index?:number;timeout?:number;maxHz?:number});
 receive(packet:unknown,now:number):boolean;
 snapshot(now:number):Gamepad|null;
 release():void;
}
export function bindRemotePad(channel:RTCDataChannel,pad:RemotePad,now?:()=>number):()=>void;
export function createRemoteSender(channel:RTCDataChannel):(axes:number[],buttons:boolean[],now:number)=>boolean;
