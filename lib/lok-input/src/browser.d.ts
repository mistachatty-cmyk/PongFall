import { LokInput, InputFrame } from './index.js';
export function isEditing(element: Element | null): boolean;
export function focusable(root: ParentNode): HTMLElement[];
export function navigate(root: ParentNode, direction: string): void;
export function startInput(options: {input?: LokInput; active?:()=>boolean; onFrame:(frames:InputFrame[],now:number)=>void; onStatus?:(status:string)=>void}):()=>void;
export function startMenuNavigation(root: HTMLElement, options?:{active?:()=>boolean;onBack?:()=>void;input?:LokInput}):()=>void;
export function keyboardAdapter(bindings:Record<string,{key:string;code:string}>[],target?:Window):{update:(frames:InputFrame[])=>void;release:()=>void};
