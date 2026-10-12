let enqueue: () => void = () => {}

/** Register the cloud sync worker without making local settings and save modules depend on it. */
export function registerCloudSyncQueue(queue: () => void): void {
  enqueue = queue
}

/** Safe to call from local-only builds, including the frozen game-jam entry. */
export function queueCloudSync(): void {
  enqueue()
}
