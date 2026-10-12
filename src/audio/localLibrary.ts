export interface LocalAudioTrack {
  id: string
  title: string
  fileName: string
  mime: string
  size: number
  addedAt: number
  favorite: boolean
}

interface StoredLocalAudioTrack extends LocalAudioTrack {
  blob: Blob
  fingerprint: string
}

const DB_NAME = 'pongfall-local-audio'
const DB_VERSION = 1
const STORE = 'tracks'
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'opus', 'oga', 'aiff', 'aif'])

function extension(fileName: string) { return fileName.split('.').pop()?.toLowerCase() ?? '' }

export function isSupportedLocalAudio(file: Pick<File, 'name' | 'type'>): boolean {
  return file.type.startsWith('audio/') || AUDIO_EXTENSIONS.has(extension(file.name))
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('This browser does not support a local music library.')); return }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open the local music library.'))
  })
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = transaction.onerror = () => reject(transaction.error ?? new Error('The local music library could not be updated.'))
  })
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('The local music library could not be read.'))
  })
}

export async function listLocalAudio(): Promise<LocalAudioTrack[]> {
  const db = await openDatabase()
  try {
    const tx = db.transaction(STORE, 'readonly')
    const rows = await requestResult(tx.objectStore(STORE).getAll()) as StoredLocalAudioTrack[]
    await transactionDone(tx)
    return rows.filter(row => row && typeof row.id === 'string' && row.blob instanceof Blob)
      .map(({ blob: _blob, fingerprint: _fingerprint, ...track }) => track)
      .sort((a, b) => a.title.localeCompare(b.title))
  } finally { db.close() }
}

export async function getLocalAudio(id: string): Promise<Blob | null> {
  const db = await openDatabase()
  try {
    const tx = db.transaction(STORE, 'readonly')
    const row = await requestResult(tx.objectStore(STORE).get(id)) as StoredLocalAudioTrack | undefined
    await transactionDone(tx)
    return row?.blob instanceof Blob ? row.blob : null
  } finally { db.close() }
}

export async function importLocalAudio(files: File[]): Promise<{ added: LocalAudioTrack[]; skipped: string[] }> {
  const accepted = files.filter(isSupportedLocalAudio)
  const skipped = files.filter(file => !isSupportedLocalAudio(file)).map(file => file.name)
  if (!accepted.length) return { added: [], skipped }
  const db = await openDatabase()
  try {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const existing = await requestResult(store.getAll()) as StoredLocalAudioTrack[]
    const fingerprints = new Set(existing.map(row => row.fingerprint))
    const added: LocalAudioTrack[] = []
    for (const file of accepted) {
      const fingerprint = `${file.name.toLowerCase()}|${file.size}|${file.lastModified}`
      if (fingerprints.has(fingerprint)) { skipped.push(file.name); continue }
      fingerprints.add(fingerprint)
      const row: StoredLocalAudioTrack = {
        id: `local-${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`,
        title: file.name.replace(/\.[^.]+$/, '') || file.name,
        fileName: file.name,
        mime: file.type,
        size: file.size,
        addedAt: Date.now(),
        favorite: false,
        fingerprint,
        blob: file,
      }
      store.add(row)
      const { blob: _blob, fingerprint: _fingerprint, ...metadata } = row
      added.push(metadata)
    }
    await transactionDone(tx)
    return { added, skipped }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      throw new Error('The browser is out of storage space. Remove local tracks or choose smaller audio files.')
    }
    throw error
  } finally { db.close() }
}

export async function setLocalAudioFavorite(id: string, favorite: boolean): Promise<void> {
  const db = await openDatabase()
  try {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const row = await requestResult(store.get(id)) as StoredLocalAudioTrack | undefined
    if (row) store.put({ ...row, favorite })
    await transactionDone(tx)
  } finally { db.close() }
}

export async function removeLocalAudio(id: string): Promise<void> {
  const db = await openDatabase()
  try {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    await transactionDone(tx)
  } finally { db.close() }
}

