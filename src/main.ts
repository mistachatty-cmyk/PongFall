import { createPongFall } from './core/createPongFall'
import { createStandaloneHost } from './host/standaloneHost'

const q = new URLSearchParams(location.search)
createPongFall(document.getElementById('app')!, {
  mode: q.get('mode') ?? undefined,
  difficulty: q.get('diff') ?? undefined,
  modifiers: q.get('mods')?.split(',').filter(Boolean),
  target: q.get('target') ? Number(q.get('target')) : undefined,
  timeLimit: q.get('time') ? Number(q.get('time')) : undefined,
  host: createStandaloneHost(),
})
