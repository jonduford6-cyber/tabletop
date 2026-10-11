import { board } from '@tabletop/freibeuter'

export const CELL = 100
export const MARGIN_X = 72
export const MARGIN_TOP = 96
export const MARGIN_BOTTOM = 72
export const GRID_SIZE = 7 * CELL
export const BOARD_WIDTH = GRID_SIZE + 2 * MARGIN_X
export const BOARD_HEIGHT = GRID_SIZE + MARGIN_TOP + MARGIN_BOTTOM

export type Point = { x: number; y: number }

const ROWS = 'ABCDEFG'

export function rowIndex(space: string): number {
    return ROWS.indexOf(space[0])
}

export function columnIndex(space: string): number {
    return Number(space.slice(1)) - 1
}

export function spaceOrigin(space: string): Point {
    return {
        x: MARGIN_X + columnIndex(space) * CELL,
        y: MARGIN_TOP + rowIndex(space) * CELL
    }
}

export function spaceCenter(space: string): Point {
    const origin = spaceOrigin(space)
    return { x: origin.x + CELL / 2, y: origin.y + CELL / 2 }
}

export function intersectionPoint(id: string): Point {
    const centers = board.intersection(id).spaces.map(spaceCenter)
    return {
        x: centers.reduce((sum, center) => sum + center.x, 0) / centers.length,
        y: centers.reduce((sum, center) => sum + center.y, 0) / centers.length
    }
}

export function boatOffsets(count: number): Point[] {
    const spread = 24
    if (count <= 1) return [{ x: 0, y: 14 }]
    if (count === 2) {
        return [
            { x: -spread, y: 14 },
            { x: spread, y: 14 }
        ]
    }
    return Array.from({ length: count }, (_, index) => ({
        x: ((index % 3) - 1) * spread,
        y: 6 + Math.floor(index / 3) * 16
    }))
}

export function rowLabelY(row: number): number {
    return MARGIN_TOP + row * CELL + CELL / 2
}

export function columnLabelX(column: number): number {
    return MARGIN_X + column * CELL + CELL / 2
}

export function shipLabel(value: number): string {
    return `${value}/${value / 5}`
}
