import * as Type from 'typebox'
import { OffsetCoordinates } from '@tabletop/common'

export const NUM_ROWS = 8
export const NUM_COLS = 12

export enum EdgeOrientation {
    Horizontal = 'horizontal',
    Vertical = 'vertical'
}

export type Edge = Type.Static<typeof Edge>
export const Edge = Type.Object({
    orientation: Type.Enum(EdgeOrientation),
    row: Type.Number(),
    col: Type.Number()
})

export function squareKey(square: OffsetCoordinates): string {
    return `${square.row},${square.col}`
}

export function edgeKey(edge: Edge): string {
    return `${edge.orientation[0]}${edge.row},${edge.col}`
}

export function isSquareOnBoard(square: OffsetCoordinates): boolean {
    return square.row >= 1 && square.row <= NUM_ROWS && square.col >= 1 && square.col <= NUM_COLS
}

export function isIntersectionOnBoard(point: OffsetCoordinates): boolean {
    return point.row >= 0 && point.row <= NUM_ROWS && point.col >= 0 && point.col <= NUM_COLS
}

export function isEdgeOnBoard(edge: Edge): boolean {
    return edge.orientation === EdgeOrientation.Horizontal
        ? edge.row >= 0 && edge.row <= NUM_ROWS && edge.col >= 0 && edge.col < NUM_COLS
        : edge.row >= 0 && edge.row < NUM_ROWS && edge.col >= 0 && edge.col <= NUM_COLS
}

export function sameEdge(a: Edge, b: Edge): boolean {
    return a.orientation === b.orientation && a.row === b.row && a.col === b.col
}

export function edgeEndpoints(edge: Edge): [OffsetCoordinates, OffsetCoordinates] {
    const start = { row: edge.row, col: edge.col }
    const end =
        edge.orientation === EdgeOrientation.Horizontal
            ? { row: edge.row, col: edge.col + 1 }
            : { row: edge.row + 1, col: edge.col }
    return [start, end]
}

export function adjacentSquares(edge: Edge): [OffsetCoordinates, OffsetCoordinates] {
    return edge.orientation === EdgeOrientation.Horizontal
        ? [
              { row: edge.row, col: edge.col + 1 },
              { row: edge.row + 1, col: edge.col + 1 }
          ]
        : [
              { row: edge.row + 1, col: edge.col },
              { row: edge.row + 1, col: edge.col + 1 }
          ]
}

export function squaresOneSpaceAway(edge: Edge): [OffsetCoordinates, OffsetCoordinates] {
    return edge.orientation === EdgeOrientation.Horizontal
        ? [
              { row: edge.row - 1, col: edge.col + 1 },
              { row: edge.row + 2, col: edge.col + 1 }
          ]
        : [
              { row: edge.row + 1, col: edge.col - 1 },
              { row: edge.row + 1, col: edge.col + 2 }
          ]
}

export function allEdges(): Edge[] {
    const edges: Edge[] = []
    for (let row = 0; row <= NUM_ROWS; row++) {
        for (let col = 0; col < NUM_COLS; col++) {
            edges.push({ orientation: EdgeOrientation.Horizontal, row, col })
        }
    }
    for (let row = 0; row < NUM_ROWS; row++) {
        for (let col = 0; col <= NUM_COLS; col++) {
            edges.push({ orientation: EdgeOrientation.Vertical, row, col })
        }
    }
    return edges
}

export function allIntersections(): OffsetCoordinates[] {
    const points: OffsetCoordinates[] = []
    for (let row = 0; row <= NUM_ROWS; row++) {
        for (let col = 0; col <= NUM_COLS; col++) {
            points.push({ row, col })
        }
    }
    return points
}

export function gridDistance(a: OffsetCoordinates, b: OffsetCoordinates): number {
    return Math.abs(a.row - b.row) + Math.abs(a.col - b.col)
}

export function samePoint(a: OffsetCoordinates, b: OffsetCoordinates): boolean {
    return a.row === b.row && a.col === b.col
}
