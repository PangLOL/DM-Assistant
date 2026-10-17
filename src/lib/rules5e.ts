import type { CharacterStats, WalkCell } from '../types'

export function chebyshev(ax: number, ay: number, bx: number, by: number): number {
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by))
}

export function squaresToFeet(squares: number, squareFeet = 5): number {
  return squares * squareFeet
}

export function isWalkable(cells: WalkCell[], x: number, y: number): boolean {
  return cells.some((c) => c.x === x && c.y === y)
}

/** Chebyshev line from A to B (inclusive). */
export function chebyshevLine(x0: number, y0: number, x1: number, y1: number): WalkCell[] {
  const cells: WalkCell[] = []
  const dx = Math.abs(x1 - x0)
  const dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let x = x0
  let y = y0
  let err = dx - dy
  while (true) {
    cells.push({ x, y })
    if (x === x1 && y === y1) break
    const e2 = 2 * err
    if (e2 > -dy) {
      err -= dy
      x += sx
    }
    if (e2 < dx) {
      err += dx
      y += sy
    }
  }
  return cells
}

export function pathIsWalkable(walkable: WalkCell[], x0: number, y0: number, x1: number, y1: number): boolean {
  return chebyshevLine(x0, y0, x1, y1).every((c) => isWalkable(walkable, c.x, c.y))
}

export function cellKey(x: number, y: number): string {
  return `${x},${y}`
}

export function speedSquares(speedFt: number, squareFeet: number): number {
  const size = squareFeet > 0 ? squareFeet : 5
  return Math.max(0, Math.floor(speedFt / size))
}

const EIGHT_NEIGHBORS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
]

function walkableKeys(cells: WalkCell[]): Set<string> {
  return new Set(cells.map((c) => cellKey(c.x, c.y)))
}

/**
 * Painted squares reachable in at most `maxSquares` steps.
 * Each step is one square, including diagonals. Other tokens block the way.
 * The origin is not included.
 */
export function reachableSquares(
  walkable: WalkCell[],
  x0: number,
  y0: number,
  maxSquares: number,
  blocked: ReadonlySet<string> = new Set(),
): Map<string, number> {
  const dist = new Map<string, number>()
  if (maxSquares <= 0) return dist
  const open = walkableKeys(walkable)
  const start = cellKey(x0, y0)
  const queue: Array<{ x: number; y: number; d: number }> = [{ x: x0, y: y0, d: 0 }]
  const seen = new Set<string>([start])
  for (let i = 0; i < queue.length; i++) {
    const { x, y, d } = queue[i]
    if (d >= maxSquares) continue
    for (const [dx, dy] of EIGHT_NEIGHBORS) {
      const nx = x + dx
      const ny = y + dy
      const key = cellKey(nx, ny)
      if (seen.has(key) || !open.has(key) || blocked.has(key)) continue
      seen.add(key)
      const next = d + 1
      dist.set(key, next)
      queue.push({ x: nx, y: ny, d: next })
    }
  }
  return dist
}

/** Step count of a painted route, or null when no route exists. */
export function routeCost(
  walkable: WalkCell[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  blocked: ReadonlySet<string> = new Set(),
): number | null {
  if (x0 === x1 && y0 === y1) return 0
  const open = walkableKeys(walkable)
  const goal = cellKey(x1, y1)
  if (!open.has(goal) || blocked.has(goal)) return null
  const start = cellKey(x0, y0)
  const queue: Array<{ x: number; y: number; d: number }> = [{ x: x0, y: y0, d: 0 }]
  const seen = new Set<string>([start])
  for (let i = 0; i < queue.length; i++) {
    const { x, y, d } = queue[i]
    for (const [dx, dy] of EIGHT_NEIGHBORS) {
      const nx = x + dx
      const ny = y + dy
      const key = cellKey(nx, ny)
      if (seen.has(key) || !open.has(key) || blocked.has(key)) continue
      const next = d + 1
      if (key === goal) return next
      seen.add(key)
      queue.push({ x: nx, y: ny, d: next })
    }
  }
  return null
}

/** Separate painted areas. A platform the party cannot walk to is its own region. */
export function walkableRegionCount(cells: WalkCell[]): number {
  const open = walkableKeys(cells)
  const seen = new Set<string>()
  let regions = 0
  for (const cell of cells) {
    const start = cellKey(cell.x, cell.y)
    if (seen.has(start) || !open.has(start)) continue
    regions += 1
    const queue = [cell]
    seen.add(start)
    for (let i = 0; i < queue.length; i++) {
      const { x, y } = queue[i]
      for (const [dx, dy] of EIGHT_NEIGHBORS) {
        const nx = x + dx
        const ny = y + dy
        const key = cellKey(nx, ny)
        if (!open.has(key) || seen.has(key)) continue
        seen.add(key)
        queue.push({ x: nx, y: ny })
      }
    }
  }
  return regions
}

export function rectCells(x0: number, y0: number, x1: number, y1: number): WalkCell[] {
  const cells: WalkCell[] = []
  const xMin = Math.min(x0, x1)
  const xMax = Math.max(x0, x1)
  const yMin = Math.min(y0, y1)
  const yMax = Math.max(y0, y1)
  for (let y = yMin; y <= yMax; y++) {
    for (let x = xMin; x <= xMax; x++) cells.push({ x, y })
  }
  return cells
}

export function parseDice(expr: string): { count: number; sides: number; bonus: number } {
  const cleaned = expr.replace(/\s+/g, '').toLowerCase()
  const match = cleaned.match(/^(\d*)d(\d+)([+-]\d+)?$/)
  if (!match) return { count: 1, sides: 6, bonus: 0 }
  return {
    count: match[1] ? Number(match[1]) : 1,
    sides: Number(match[2]),
    bonus: match[3] ? Number(match[3]) : 0,
  }
}

export function rollDie(sides: number): number {
  return 1 + Math.floor(Math.random() * Math.max(1, sides))
}

export function rollDiceExpr(expr: string): { total: number; detail: string } {
  const { count, sides, bonus } = parseDice(expr)
  const rolls: number[] = []
  for (let i = 0; i < count; i++) rolls.push(rollDie(sides))
  const total = rolls.reduce((a, b) => a + b, 0) + bonus
  const bonusTxt = bonus === 0 ? '' : bonus > 0 ? `+${bonus}` : String(bonus)
  return { total, detail: `${rolls.join('+')}${bonusTxt}` }
}

export function rollD20(advantage: boolean, disadvantage: boolean): { used: number; rolls: number[] } {
  if (advantage === disadvantage) {
    const n = rollDie(20)
    return { used: n, rolls: [n] }
  }
  const a = rollDie(20)
  const b = rollDie(20)
  return { used: advantage ? Math.max(a, b) : Math.min(a, b), rolls: [a, b] }
}

export function attackPreview(
  stats: CharacterStats,
  targetAc: number,
  d20: number,
  distanceFt: number,
): { hit: boolean; crit: boolean; fumble: boolean; total: number; summary: string } {
  const total = d20 + stats.attackBonus
  const crit = d20 === 20
  const fumble = d20 === 1
  const hit = crit || (!fumble && total >= targetAc)
  const reach = distanceFt <= stats.rangeFt ? 'melee/reach' : `at ${distanceFt} ft`
  const summary = `d20 ${d20} + ${stats.attackBonus} = ${total} vs AC ${targetAc} (${reach}) → ${
    crit ? 'CRIT' : fumble ? 'fumble' : hit ? 'HIT' : 'miss'
  }`
  return { hit, crit, fumble, total, summary }
}

export function effectiveAc(stats: CharacterStats): number {
  return stats.ac || (stats.armor > 0 ? 10 + stats.armor : 10)
}
