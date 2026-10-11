import { describe, expect, it } from 'vitest'
import {
    addCanalPiece,
    armsOf,
    canalPlacementProblem,
    canalsRemaining,
    legalCanalEdges,
    springPlacementProblem,
    springsRemaining,
    type Canal
} from './canals.js'
import { EdgeOrientation, type Edge } from './geometry.js'

const point = (row: number, col: number) => ({ row, col })
const h = (row: number, col: number, count = 1): Canal => ({
    orientation: EdgeOrientation.Horizontal,
    row,
    col,
    count
})
const v = (row: number, col: number, count = 1): Canal => ({
    orientation: EdgeOrientation.Vertical,
    row,
    col,
    count
})
const edgeOf = ({ orientation, row, col }: Canal): Edge => ({ orientation, row, col })

const springProblem = (
    springs: ReturnType<typeof point>[],
    canals: Canal[],
    at: ReturnType<typeof point>
) => springPlacementProblem({ springs, canals }, at)
const canalProblem = (springs: ReturnType<typeof point>[], canals: Canal[], edge: Canal) =>
    canalPlacementProblem({ springs, canals }, edgeOf(edge))

describe('Spring placement', () => {
    it('allows the first spring on any intersection, including corners and borders', () => {
        expect(springProblem([], [], point(0, 0))).toBeUndefined()
        expect(springProblem([], [], point(8, 12))).toBeUndefined()
        expect(springProblem([], [], point(0, 7))).toBeUndefined()
        expect(springProblem([], [], point(4, 6))).toBeUndefined()
    })

    it('rejects intersections off the board', () => {
        expect(springProblem([], [], point(9, 0))).toMatch(/not on the board/)
        expect(springProblem([], [], point(0, -1))).toMatch(/not on the board/)
    })

    it('rejects an intersection that already has a spring', () => {
        expect(springProblem([point(4, 6)], [], point(4, 6))).toMatch(/already a spring/)
    })

    it('rejects springs closer than 5 steps along the grid lines', () => {
        const springs = [point(4, 6)]
        for (const close of [
            point(4, 7),
            point(4, 8),
            point(5, 8),
            point(6, 8),
            point(6, 7),
            point(2, 8)
        ]) {
            expect(springProblem(springs, [], close)).toMatch(/at least 5 steps/)
        }
        expect(springProblem(springs, [], point(4, 10))).toMatch(/at least 5 steps/)
    })

    it('allows springs exactly 5 steps apart', () => {
        const springs = [point(4, 6)]
        expect(springProblem(springs, [], point(4, 11))).toBeUndefined()
        expect(springProblem(springs, [], point(6, 9))).toBeUndefined()
        expect(springProblem(springs, [], point(0, 5))).toBeUndefined()
        expect(springProblem(springs, [], point(8, 7))).toBeUndefined()
    })

    it('measures against every existing spring', () => {
        const springs = [point(0, 0), point(8, 12)]
        expect(springProblem(springs, [], point(4, 8))).toBeUndefined()
        expect(springProblem(springs, [], point(7, 9))).toMatch(/at least 5 steps/)
    })

    it('rejects an intersection a canal already touches', () => {
        const canals = [h(4, 6), h(4, 7), h(4, 8), h(4, 9), h(4, 10)]
        expect(springProblem([point(4, 6)], canals, point(4, 11))).toMatch(/canal already touches/)
    })

    it('rejects a sixth spring', () => {
        const springs = [point(0, 0), point(0, 5), point(0, 10), point(5, 0), point(5, 5)]
        expect(springsRemaining(springs)).toBe(0)
        expect(springProblem(springs, [], point(8, 12))).toMatch(/No springs left/)
    })
})

describe('Canal placement', () => {
    const spring = [point(4, 6)]

    it('requires a spring before any canal', () => {
        expect(canalProblem([], [], h(4, 6))).toMatch(/spring must be discovered/)
    })

    it('requires the edge to be on the board', () => {
        expect(canalProblem([point(0, 11)], [], h(0, 12))).toMatch(/not on the board/)
    })

    it('allows a first canal on each of the four edges around a spring', () => {
        expect(canalProblem(spring, [], h(4, 6))).toBeUndefined()
        expect(canalProblem(spring, [], h(4, 5))).toBeUndefined()
        expect(canalProblem(spring, [], v(4, 6))).toBeUndefined()
        expect(canalProblem(spring, [], v(3, 6))).toBeUndefined()
        expect(legalCanalEdges({ springs: spring, canals: [] })).toHaveLength(4)
    })

    it('limits a corner spring to its two edges', () => {
        expect(legalCanalEdges({ springs: [point(0, 0)], canals: [] })).toHaveLength(2)
    })

    it('rejects a canal that touches no spring or canal', () => {
        expect(canalProblem(spring, [], h(1, 1))).toMatch(/start at a spring or the end of a canal/)
    })

    it('extends an arm at its free end', () => {
        expect(canalProblem(spring, [h(4, 6)], h(4, 7))).toBeUndefined()
        expect(canalProblem(spring, [h(4, 6)], v(4, 7))).toBeUndefined()
        expect(canalProblem(spring, [h(4, 6)], v(3, 7))).toBeUndefined()
    })

    it('lets an arm turn in any direction, including right then down then left', () => {
        const canals = [h(4, 6), v(4, 7)]
        expect(canalProblem(spring, canals, h(5, 6))).toBeUndefined()
        expect(canalProblem(spring, canals, h(5, 7))).toBeUndefined()
    })

    it('allows two arms from a spring, on opposite or perpendicular sides', () => {
        expect(canalProblem(spring, [v(3, 6)], v(4, 6))).toBeUndefined()
        expect(canalProblem(spring, [v(3, 6)], h(4, 6))).toBeUndefined()
        expect(canalProblem(spring, [h(4, 5)], h(4, 6))).toBeUndefined()
    })

    it('rejects a third arm from a spring', () => {
        const opposite = [v(3, 6), v(4, 6)]
        expect(canalProblem(spring, opposite, h(4, 6))).toMatch(/at most two canal arms/)
        expect(canalProblem(spring, opposite, h(4, 5))).toMatch(/at most two canal arms/)
        const perpendicular = [v(3, 6), h(4, 6)]
        expect(canalProblem(spring, perpendicular, v(4, 6))).toMatch(/at most two canal arms/)
    })

    it('does not count a long arm that wanders as extra arms', () => {
        const canals = [h(4, 6), v(4, 7), h(5, 6)]
        expect(armsOf(canals, point(4, 6))).toHaveLength(1)
        expect(canalProblem(spring, canals, v(3, 6))).toBeUndefined()
    })

    it('rejects a branch off the middle of an arm', () => {
        const canals = [h(4, 6), v(4, 7)]
        expect(canalProblem(spring, canals, h(4, 7))).toMatch(/cannot branch off/)
        expect(canalProblem(spring, canals, v(3, 7))).toMatch(/cannot branch off/)
    })

    it('rejects a canal that would join two springs systems', () => {
        const springs = [point(4, 6), point(4, 11)]
        const canals = [h(4, 6), h(4, 7), h(4, 10), h(4, 9)]
        expect(canalProblem(springs, canals, h(4, 8))).toMatch(/join two systems/)
    })

    it('rejects a canal that closes a loop back onto the spring', () => {
        const canals = [h(4, 6), v(4, 7), h(5, 6)]
        expect(canalProblem(spring, canals, v(4, 6))).toMatch(/join two systems or form a loop/)
    })

    it('rejects a canal that runs from one systems arm into another spring', () => {
        const springs = [point(4, 6), point(4, 11)]
        const canals = [h(4, 6), h(4, 7), h(4, 8), h(4, 9)]
        expect(canalProblem(springs, canals, h(4, 10))).toMatch(/join two systems/)
    })

    it('rejects canals when none are left', () => {
        const used = Array.from({ length: 18 }, (_, index) => h(0, index % 12, 2))
        const canals = used.map((canal, index) => ({ ...canal, row: Math.floor(index / 12) * 8 }))
        expect(canalsRemaining(canals)).toBe(0)
        expect(canalProblem(spring, canals, h(4, 6))).toMatch(/No canals left/)
    })
})

describe('Double canals', () => {
    const spring = [point(4, 6)]

    it('lets the first edge at a spring become double', () => {
        expect(canalProblem(spring, [v(3, 6)], v(3, 6))).toBeUndefined()
    })

    it('rejects a third canal on an edge', () => {
        expect(canalProblem(spring, [v(3, 6, 2)], v(3, 6))).toMatch(/already has a double canal/)
    })

    it('rejects doubling an edge downstream of a single edge', () => {
        const canals = [v(3, 6), h(3, 6)]
        expect(canalProblem(spring, canals, h(3, 6))).toMatch(/must start at a spring/)
    })

    it('allows doubling an edge downstream of a double edge', () => {
        const canals = [v(3, 6, 2), h(3, 6)]
        expect(canalProblem(spring, canals, h(3, 6))).toBeUndefined()
    })

    it('allows a double canal to turn a corner and be followed by single edges', () => {
        const canals = [v(3, 6, 2), h(3, 6, 2)]
        expect(canalProblem(spring, canals, v(2, 7))).toBeUndefined()
    })

    it('rejects a double edge after a single edge even if a double comes earlier', () => {
        const canals = [v(3, 6, 2), h(3, 6), v(2, 7)]
        expect(canalProblem(spring, canals, v(2, 7))).toMatch(/must start at a spring/)
    })

    it('allows doubling an upstream edge after downstream edges exist', () => {
        const canals = [v(3, 6), h(3, 6), v(2, 7)]
        expect(canalProblem(spring, canals, v(3, 6))).toBeUndefined()
    })

    it('doubles on the second arm independently of the first', () => {
        const canals = [v(3, 6, 2), v(4, 6), h(5, 6)]
        expect(canalProblem(spring, canals, v(4, 6))).toBeUndefined()
        expect(canalProblem(spring, canals, h(5, 6))).toMatch(/must start at a spring/)
    })
})

describe('Adding canal pieces', () => {
    it('creates an edge with one canal, then makes it double', () => {
        const canals: Canal[] = []
        const edge = edgeOf(h(4, 6))
        expect(addCanalPiece(canals, edge)).toBe(1)
        expect(addCanalPiece(canals, edge)).toBe(2)
        expect(canals).toEqual([h(4, 6, 2)])
        expect(canalsRemaining(canals)).toBe(34)
    })
})
