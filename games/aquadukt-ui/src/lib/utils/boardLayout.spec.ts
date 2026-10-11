import { describe, expect, it } from 'vitest'
import { Board, EdgeOrientation } from '@tabletop/aquadukt'
import {
    BOARD_HEIGHT,
    BOARD_WIDTH,
    CELL,
    MARGIN,
    cornerRockSquares,
    edgeSegment,
    intersectionPoint,
    offsetSegment,
    regionBorders,
    regionLabelPosition,
    squareCenter,
    squareOrigin
} from './boardLayout.js'

describe('Board layout', () => {
    it('places squares and intersections on one grid', () => {
        expect(squareOrigin({ row: 1, col: 1 })).toEqual({ x: MARGIN, y: MARGIN })
        expect(squareCenter({ row: 2, col: 3 })).toEqual({
            x: MARGIN + 2 * CELL + CELL / 2,
            y: MARGIN + CELL + CELL / 2
        })
        expect(intersectionPoint({ row: 8, col: 12 })).toEqual({
            x: BOARD_WIDTH - MARGIN,
            y: BOARD_HEIGHT - MARGIN
        })
    })

    it('draws an edge between its two intersections', () => {
        const horizontal = { orientation: EdgeOrientation.Horizontal, row: 3, col: 4 }
        const vertical = { orientation: EdgeOrientation.Vertical, row: 3, col: 4 }
        const start = intersectionPoint({ row: 3, col: 4 })
        expect(edgeSegment(horizontal)).toEqual({
            x1: start.x,
            y1: start.y,
            x2: start.x + CELL,
            y2: start.y
        })
        expect(edgeSegment(vertical)).toEqual({
            x1: start.x,
            y1: start.y,
            x2: start.x,
            y2: start.y + CELL
        })
    })

    it('offsets the lanes of a double canal across the edge', () => {
        const horizontal = { orientation: EdgeOrientation.Horizontal, row: 3, col: 4 }
        const vertical = { orientation: EdgeOrientation.Vertical, row: 3, col: 4 }
        const flat = edgeSegment(horizontal)
        const upright = edgeSegment(vertical)
        expect(offsetSegment(flat, 6, horizontal)).toEqual({
            ...flat,
            y1: flat.y1 + 6,
            y2: flat.y2 + 6
        })
        expect(offsetSegment(upright, -6, vertical)).toEqual({
            ...upright,
            x1: upright.x1 - 6,
            x2: upright.x2 - 6
        })
    })

    it('finds the four corner rocks', () => {
        expect(cornerRockSquares()).toEqual([
            { row: 1, col: 1 },
            { row: 1, col: 12 },
            { row: 8, col: 1 },
            { row: 8, col: 12 }
        ])
    })

    it('draws a border wherever the region changes or the board ends', () => {
        const borders = regionBorders()
        const regionTwo = borders.filter((border) => border.region === 2)
        expect(regionTwo).toHaveLength(8)
        const perimeterOfRegionFive = borders.filter((border) => border.region === 5)
        expect(perimeterOfRegionFive).toHaveLength(10)
        expect(borders.length).toBeGreaterThan(Board.playableSquares.length)
    })

    it('puts every region number on a corner of one of its own squares', () => {
        for (let region = 1; region <= 20; region++) {
            const label = regionLabelPosition(region)
            const onCorner = Board.squaresInRegion(region).some((square) => {
                const { x, y } = squareOrigin(square)
                return [x, x + CELL].includes(label.x) && [y, y + CELL].includes(label.y)
            })
            expect(onCorner).toBe(true)
        }
    })
})
