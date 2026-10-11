import { describe, expect, it } from 'vitest'
import { BOARD_DATA } from '../definition/boardData.js'
import { CIRCLE_SIZE } from '../definition/setup.js'
import { Board, board, checkBoardData, placeKey, type BoardData } from './board.js'

function mutated(change: (data: BoardData) => void): BoardData {
    const copy = structuredClone(BOARD_DATA)
    change(copy)
    return copy
}

describe('Board data', () => {
    it('has 78 stone places', () => {
        expect(board.places).toHaveLength(78)
    })

    it('has 28 circles: 10 tetragonal, 8 hexagonal, 10 octagonal', () => {
        expect(board.circles).toHaveLength(28)
        const count = (shape: string) => board.circles.filter((c) => c.shape === shape).length
        expect([count('tetragonal'), count('hexagonal'), count('octagonal')]).toEqual([10, 8, 10])
    })

    it('has circle sizes that match their shape and add up to 168', () => {
        for (const circle of board.circles) {
            expect(circle.places).toHaveLength(CIRCLE_SIZE[circle.shape])
        }
        expect(board.circles.reduce((sum, c) => sum + c.places.length, 0)).toBe(168)
    })

    it('puts every stone place in 1 to 3 circles', () => {
        const histogram: Record<number, number> = {}
        for (const place of board.places) {
            const count = board.circlesAt(place).length
            histogram[count] = (histogram[count] ?? 0) + 1
        }
        expect(histogram).toEqual({ 1: 24, 2: 18, 3: 36 })
    })

    it('has 42 border places, the ones in fewer than 3 circles', () => {
        const border = board.places.filter((place) => board.isBorder(place))
        expect(border).toHaveLength(42)
        expect(border.every((place) => board.circlesAt(place).length < 3)).toBe(true)
    })

    it('prints on every circle the top factor of its shape', () => {
        const byShape = { tetragonal: 3, hexagonal: 4, octagonal: 5 }
        for (const circle of board.circles) {
            expect(circle.printedFactor).toBe(byShape[circle.shape])
        }
    })

    it('makes places next to each other around a circle neighbours', () => {
        expect(board.neighbours({ row: 2, col: 2 }).map(placeKey).sort()).toEqual(
            ['1,2', '2,1', '3,3'].sort()
        )
        expect(board.neighbours({ row: 2, col: 4 }).map(placeKey).sort()).toEqual(
            ['1,4', '3,3', '3,5'].sort()
        )
    })

    it('gives every place 3 or 4 neighbours, and the four corners 5', () => {
        const corners = ['1,1', '1,14', '9,1', '9,14']
        for (const place of board.places) {
            const count = board.neighbours(place).length
            if (corners.includes(placeKey(place))) {
                expect(count).toBe(5)
            } else {
                expect(count).toBeGreaterThanOrEqual(3)
                expect(count).toBeLessThanOrEqual(4)
            }
        }
    })

    it('links a top stone to the bottom stone in its column and a left stone to the right', () => {
        expect(board.neighbours({ row: 0, col: 3 }).map(placeKey)).toContain('8,3')
        expect(board.neighbours({ row: 1, col: 2 }).map(placeKey)).toContain('9,2')
        expect(board.neighbours({ row: 3, col: 0 }).map(placeKey)).toContain('3,15')
        expect(board.neighbours({ row: 2, col: 1 }).map(placeKey)).toContain('2,14')
    })

    it('lets each corner jump to the other three corners', () => {
        const corners = ['1,1', '1,14', '9,1', '9,14']
        for (const corner of corners) {
            const [row, col] = corner.split(',').map(Number)
            const neighbours = board.neighbours({ row, col }).map(placeKey)
            for (const other of corners.filter((c) => c !== corner)) {
                expect(neighbours).toContain(other)
            }
        }
    })

    it('passes its own consistency check', () => {
        expect(checkBoardData(BOARD_DATA)).toEqual([])
    })
})

describe('Board data checks at load', () => {
    const failsWith = (data: BoardData, message: string) => {
        expect(() => new Board(data)).toThrow('The board data is inconsistent')
        expect(checkBoardData(data).join('\n')).toContain(message)
    }

    it('fails when a circle is missing', () => {
        failsWith(
            mutated((data) => data.circles.pop()),
            'Expected 28 circles but found 27'
        )
    })

    it('fails when a circle has the wrong number of stone places', () => {
        failsWith(
            mutated((data) => data.circles[0].stonePlaces.pop()),
            'Circle 1 (tetragonal) has 3 stone places, expected 4'
        )
    })

    it('fails when a circle uses a place that is not a stone place', () => {
        failsWith(
            mutated((data) => {
                data.circles[0].stonePlaces[0] = [0, 0]
            }),
            '(0,0), which is not a stone place'
        )
    })

    it('fails when a stone place is in four circles', () => {
        failsWith(
            mutated((data) => {
                data.circles[1].stonePlaces[0] = [2, 2]
            }),
            'is in 4 circles'
        )
    })

    it('fails when a printed number differs from the top factor of the shape', () => {
        failsWith(
            mutated((data) => {
                data.circles[0].printedFactor = 4
            }),
            'prints 4 but the top factor of its shape is 3'
        )
    })

    it('fails when a border link points at a place that is not on the border', () => {
        failsWith(
            mutated((data) => {
                data.borderLinks[0] = [
                    [2, 2],
                    [0, 3]
                ]
            }),
            'which is not a border place'
        )
    })

    it('fails when a border place has no link', () => {
        failsWith(
            mutated((data) => data.borderLinks.pop()),
            'has 0 links, expected exactly 1'
        )
    })

    it('fails when a corner has fewer than three jump targets', () => {
        failsWith(
            mutated((data) => data.cornerLinks.pop()),
            'jump targets, expected 3'
        )
    })

    it('fails when the board has too few stone places for five players', () => {
        failsWith(
            mutated((data) => {
                data.stonePlaceColumnsByRow[8] = []
                data.stonePlaceColumnsByRow[9] = []
            }),
            'a 5-player game needs at least 65'
        )
    })

    it('fails when the scoring track start is outside the track', () => {
        failsWith(
            mutated((data) => {
                data.scoringTrack.startField = 101
            }),
            'start field is outside the track'
        )
    })
})
