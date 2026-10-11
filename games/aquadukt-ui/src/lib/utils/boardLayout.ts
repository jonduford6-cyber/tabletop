import type { OffsetCoordinates } from '@tabletop/common'
import { Board, EdgeOrientation, type Edge } from '@tabletop/aquadukt'

export const CELL = 60
export const MARGIN = 26
export const NUM_ROWS = 8
export const NUM_COLS = 12
export const BOARD_WIDTH = MARGIN * 2 + NUM_COLS * CELL
export const BOARD_HEIGHT = MARGIN * 2 + NUM_ROWS * CELL

export type Segment = { x1: number; y1: number; x2: number; y2: number }
export type RegionBorder = Segment & { region: number }

export function squareOrigin(square: OffsetCoordinates): { x: number; y: number } {
    return { x: MARGIN + (square.col - 1) * CELL, y: MARGIN + (square.row - 1) * CELL }
}

export function squareCenter(square: OffsetCoordinates): { x: number; y: number } {
    const { x, y } = squareOrigin(square)
    return { x: x + CELL / 2, y: y + CELL / 2 }
}

export function intersectionPoint(point: OffsetCoordinates): { x: number; y: number } {
    return { x: MARGIN + point.col * CELL, y: MARGIN + point.row * CELL }
}

export function edgeSegment(edge: Edge): Segment {
    const start = intersectionPoint(edge)
    const end =
        edge.orientation === EdgeOrientation.Horizontal
            ? { x: start.x + CELL, y: start.y }
            : { x: start.x, y: start.y + CELL }
    return { x1: start.x, y1: start.y, x2: end.x, y2: end.y }
}

export function offsetSegment(segment: Segment, offset: number, edge: Edge): Segment {
    const horizontal = edge.orientation === EdgeOrientation.Horizontal
    return horizontal
        ? { ...segment, y1: segment.y1 + offset, y2: segment.y2 + offset }
        : { ...segment, x1: segment.x1 + offset, x2: segment.x2 + offset }
}

export function allSquares(): OffsetCoordinates[] {
    const squares: OffsetCoordinates[] = []
    for (let row = 1; row <= NUM_ROWS; row++) {
        for (let col = 1; col <= NUM_COLS; col++) {
            squares.push({ row, col })
        }
    }
    return squares
}

export function cornerRockSquares(): OffsetCoordinates[] {
    return allSquares().filter((square) => !Board.isPlayable(square))
}

function regionAt(square: OffsetCoordinates): number | undefined {
    return Board.isPlayable(square) ? Board.regionOf(square) : undefined
}

export function regionBorders(): RegionBorder[] {
    const borders: RegionBorder[] = []
    for (const square of Board.playableSquares) {
        const region = Board.regionOf(square)
        const { x, y } = squareOrigin(square)
        const sides: [OffsetCoordinates, Segment][] = [
            [
                { row: square.row - 1, col: square.col },
                { x1: x, y1: y, x2: x + CELL, y2: y }
            ],
            [
                { row: square.row + 1, col: square.col },
                { x1: x, y1: y + CELL, x2: x + CELL, y2: y + CELL }
            ],
            [
                { row: square.row, col: square.col - 1 },
                { x1: x, y1: y, x2: x, y2: y + CELL }
            ],
            [
                { row: square.row, col: square.col + 1 },
                { x1: x + CELL, y1: y, x2: x + CELL, y2: y + CELL }
            ]
        ]
        for (const [neighbor, segment] of sides) {
            if (regionAt(neighbor) !== region) borders.push({ ...segment, region })
        }
    }
    return borders
}

export function regionLabelPosition(region: number): { x: number; y: number } {
    const squares = Board.squaresInRegion(region)
    const centers = squares.map(squareCenter)
    const centroid = {
        x: centers.reduce((sum, center) => sum + center.x, 0) / centers.length,
        y: centers.reduce((sum, center) => sum + center.y, 0) / centers.length
    }
    const corners = squares.flatMap((square) => {
        const { x, y } = squareOrigin(square)
        return [
            { x, y },
            { x: x + CELL, y },
            { x, y: y + CELL },
            { x: x + CELL, y: y + CELL }
        ]
    })
    const distance = (point: { x: number; y: number }) =>
        Math.hypot(point.x - centroid.x, point.y - centroid.y)
    return corners.reduce((best, corner) => (distance(corner) < distance(best) ? corner : best))
}

const REGION_TINTS = ['#9fcf7b', '#b5d986', '#8fc47a', '#c3dd8e', '#a6d08c']

export function regionTint(region: number): string {
    return REGION_TINTS[region % REGION_TINTS.length]
}
