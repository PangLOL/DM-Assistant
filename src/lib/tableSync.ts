/** Public table state sent to player devices (no DM notes/scenes). */
export type TableHello = { type: 'hello'; name?: string }

export type TablePropose = {
  type: 'propose'
  actorKind: 'player' | 'npc'
  actorId: string
  action: 'move' | 'attack'
  targetGx: number | null
  targetGy: number | null
  targetId: string | null
  d20: number | null
  advantage: boolean
  disadvantage: boolean
  feet?: number | null
  damage?: number | null
}

export type TableStateMsg = {
  type: 'state'
  payload: unknown
}

export type TableMsg = TableHello | TablePropose | TableStateMsg

type PeerLike = {
  id: string
  destroy: () => void
  on: (ev: string, cb: (...args: never[]) => void) => void
  connect: (id: string) => DataConn
}

export type DataConn = {
  open: boolean
  peer: string
  send: (data: unknown) => void
  on: (ev: string, cb: (...args: never[]) => void) => void
  close: () => void
}

declare global {
  interface Window {
    Peer?: new (id?: string, opts?: { debug?: number }) => PeerLike
  }
}

const PREFIX = 'dma'

export function randomRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

export function peerIdForRoom(room: string): string {
  return `${PREFIX}${room.toUpperCase().replace(/[^A-Z0-9]/g, '')}`
}

function loadPeerScript(): Promise<void> {
  if (window.Peer) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const tag = document.createElement('script')
    tag.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js'
    tag.onload = () => resolve()
    tag.onerror = () => reject(new Error('Could not load PeerJS'))
    document.head.appendChild(tag)
  })
}

export async function hostTable(
  room: string,
  onClient: (conn: DataConn) => void,
): Promise<{ peer: PeerLike; room: string }> {
  await loadPeerScript()
  const PeerCtor = window.Peer
  if (!PeerCtor) throw new Error('PeerJS unavailable')
  const peer = new PeerCtor(peerIdForRoom(room), { debug: 0 })
  await waitOpen(peer)
  peer.on('connection', ((conn: DataConn) => {
    conn.on('open', (() => onClient(conn)) as never)
  }) as never)
  return { peer, room }
}

export async function joinTable(
  room: string,
  onData: (msg: TableMsg) => void,
): Promise<{ peer: PeerLike; conn: DataConn }> {
  await loadPeerScript()
  const PeerCtor = window.Peer
  if (!PeerCtor) throw new Error('PeerJS unavailable')
  const peer = new PeerCtor(undefined, { debug: 0 })
  await waitOpen(peer)
  const conn = peer.connect(peerIdForRoom(room))
  await new Promise<void>((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error('Could not reach the DM table. Check the room code.')), 12000)
    conn.on('open', (() => {
      window.clearTimeout(t)
      resolve()
    }) as never)
    conn.on('error', ((err: unknown) => {
      window.clearTimeout(t)
      reject(err instanceof Error ? err : new Error('Join failed'))
    }) as never)
  })
  conn.on('data', ((msg: TableMsg) => onData(msg)) as never)
  conn.send({ type: 'hello' } satisfies TableHello)
  return { peer, conn }
}

function waitOpen(peer: PeerLike): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error('Network table failed to start')), 12000)
    peer.on('open', (() => {
      window.clearTimeout(t)
      resolve()
    }) as never)
    peer.on('error', ((err: unknown) => {
      window.clearTimeout(t)
      reject(err instanceof Error ? err : new Error('Peer error'))
    }) as never)
  })
}

export function broadcast(conns: DataConn[], msg: TableMsg) {
  conns.forEach((c) => {
    if (c.open) c.send(msg)
  })
}
