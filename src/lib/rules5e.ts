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
