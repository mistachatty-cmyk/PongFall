export type Binding = { button: number; axis?: never; direction?: never } | { axis: number; direction: -1 | 1; button?: never };
export type ActionMap = Record<string, Binding>;
export interface InputFrame { player: number; index: number; mapping: string; move: [number, number]; look: [number, number]; actions: Record<string,boolean>; pressed: Record<string,boolean>; released: Record<string,boolean> }
export const STANDARD_MAP: Readonly<ActionMap>;
export function deadzone(value: number, threshold?: number): number;
export function validMap(map: unknown): map is ActionMap;
export class LokInput {
 constructor(options?: {maxPlayers?: number; map?: ActionMap; threshold?: number});
 slots: Map<number,number>;
 setMap(map: ActionMap): void;
 reset(): void;
 leave(player: number): void;
 poll(gamepads: ArrayLike<Gamepad | null>, active?: boolean): InputFrame[];
}
export function readGamepads(nav?: Pick<Navigator,'getGamepads'>): {pads: Gamepad[]; status: 'available' | 'unsupported' | 'blocked'};
export function loadMap(storage: Pick<Storage,'getItem'>, app: string, fallback?: ActionMap): ActionMap;
export function saveMap(storage: Pick<Storage,'setItem'>, app: string, map: ActionMap): boolean;
export class MenuRepeat { step(move: [number,number], now: number): '' | 'left' | 'right' | 'up' | 'down' }
export function canvasSize(width: number, height: number, quality?: string): {width: number; height: number};
