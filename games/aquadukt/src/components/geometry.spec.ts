import { describe, expect, it } from 'vitest'
import {
    EdgeOrientation,
    adjacentSquares,
    allEdges,
    allIntersections,
    edgeEndpoints,
    gridDistance,
    isEdgeOnBoard,
    squaresOneSpaceAway
} from './geometry.js'

const horizontal = (row: number, col: number) => ({
    orientation: EdgeOrientation.Horizontal,
    row,
    col
})
const vertical = (row: number, col: number) => ({ orientation: EdgeOrientation.Vertical, row, col })

describe('Board geometry', () => {
    it('has 117 intersections and 212 edges', () => {
        expect(allIntersections()).toHaveLength(13 * 9)
        expect(allEdges()).toHaveLength(9 * 12 + 8 * 13)
        expect(allEdges().every(isEdgeOnBoard)).toBe(true)
    })

    it('rejects edges off the board', () => {
        expect(isEdgeOnBoard(horizontal(0, 12))).toBe(false)
        expect(isEdgeOnBoard(vertical(8, 0))).toBe(false)
        expect(isEdgeOnBoard(horizontal(-1, 0))).toBe(false)
    })

    it('finds the endpoints of an edge', () => {
        expect(edgeEndpoints(horizontal(3, 4))).toEqual([
            { row: 3, col: 4 },
            { row: 3, col: 5 }
        ])
        expect(edgeEndpoints(vertical(3, 4))).toEqual([
            { row: 3, col: 4 },
            { row: 4, col: 4 }
        ])
    })

    it('finds the squares on either side of a horizontal edge', () => {
        expect(adjacentSquares(horizontal(3, 4))).toEqual([
            { row: 3, col: 5 },
            { row: 4, col: 5 }
        ])
        expect(squaresOneSpaceAway(horizontal(3, 4))).toEqual([
            { row: 2, col: 5 },
            { row: 5, col: 5 }
        ])
    })

    it('finds the squares on either side of a vertical edge', () => {
        expect(adjacentSquares(vertical(3, 4))).toEqual([
            { row: 4, col: 4 },
            { row: 4, col: 5 }
        ])
        expect(squaresOneSpaceAway(vertical(3, 4))).toEqual([
            { row: 4, col: 3 },
            { row: 4, col: 6 }
        ])
    })

    it('measures distance in steps along the grid lines', () => {
        expect(gridDistance({ row: 0, col: 0 }, { row: 2, col: 3 })).toBe(5)
        expect(gridDistance({ row: 4, col: 4 }, { row: 4, col: 4 })).toBe(0)
    })
})
