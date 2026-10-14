const KEY = 'pongfall.activeRoom.v1'

export function activeRoomCode(): string | null {
  try { return sessionStorage.getItem(KEY) } catch { return null }
}

export function rememberRoom(code: string): void {
  try { sessionStorage.setItem(KEY, code) } catch { /* private storage can be disabled */ }
}

export function forgetRoom(): void {
  try { sessionStorage.removeItem(KEY) } catch { /* private storage can be disabled */ }
}
