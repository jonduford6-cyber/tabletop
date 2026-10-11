import { board, placeKey } from '@tabletop/dolmengotter'
import { describe, expect, it } from 'vitest'
import {
    CORNER_RUNE,
    UNIT,
    circleCenter,
    drawnLines,
    idealX,
    idealY,
    numberPosition,
    placePoint,
    runeLinks,
    runes,
    stackLayout
} from './boardGeometry.js'

const s = 1 / Math.SQRT2

describe('Ideal drawing coordinates', () => {
    it('follow the columns of the spec', () => {
        expect(idealX(0)).toBeCloseTo(0)
        expect(idealX(1)).toBeCloseTo(s)
        expect(idealX(2)).toBeCloseTo(s + 1)
        expect(idealX(3)).toBeCloseTo(2 * s + 1)
        expect(idealX(6)).toBeCloseTo(4 * s + 2)
        expect(idealX(9)).toBeCloseTo(6 * s + 3)
        expect(idealX(12)).toBeCloseTo(8 * s + 4)
        expect(idealX(15)).toBeCloseTo(10 * s + 5)
    })

    it('follow the rows of the spec', () => {
        expect(idealY(0)).toBeCloseTo(0)
        expect(idealY(1)).toBeCloseTo(s)
        expect(idealY(2)).toBeCloseTo(s + 1)
        expect(idealY(4)).toBeCloseTo(2 * s + 2)
        expect(idealY(7)).toBeCloseTo(4 * s + 3)
        expect(idealY(9)).toBeCloseTo(5 * s + 4)
    })

    it('give each of the 78 stone places its own point', () => {
        const points = new Set(
            board.places.map((place) => {
                const { x, y } = placePoint(place)
                return `${x.toFixed(2)},${y.toFixed(2)}`
            })
        )
        expect(points.size).toBe(78)
    })

    it('draw every line between neighbours with the same length', () => {
        const lines = drawnLines()
        expect(lines).toHaveLength(105)
        for (const line of lines) {
            expect(Math.hypot(line.to.x - line.from.x, line.to.y - line.from.y)).toBeCloseTo(UNIT)
        }
    })
})

describe('Border runes', () => {
    const marks = runes()
    const symbolOf = (key: string) => marks.find((mark) => placeKey(mark.place) === key)?.symbol

    it('mark each of the 42 border stones', () => {
        expect(marks).toHaveLength(42)
        expect(marks.every((mark) => board.isBorder(mark.place))).toBe(true)
    })

    it('give two opposite stones the same symbol', () => {
        expect(symbolOf('3,0')).toBe(symbolOf('3,15'))
        expect(symbolOf('0,3')).toBe(symbolOf('8,3'))
        expect(symbolOf('1,2')).toBe(symbolOf('9,2'))
        expect(symbolOf('2,1')).toBe(symbolOf('2,14'))
    })

    it('use a different symbol for every pair', () => {
        const pairSymbols = marks
            .filter((mark) => mark.symbol !== CORNER_RUNE)
            .map((mark) => mark.symbol)
        expect(new Set(pairSymbols).size).toBe(19)
        expect(pairSymbols).toHaveLength(38)
    })

    it('give all four corners the same symbol', () => {
        const corners = ['1,1', '1,14', '9,1', '9,14'].map(symbolOf)
        expect(new Set(corners)).toEqual(new Set([CORNER_RUNE]))
    })

    it('link every border stone to exactly one other, except corners that link to three', () => {
        const links = runeLinks()
        for (const [key, partners] of links) {
            expect(partners.length).toBe(['1,1', '1,14', '9,1', '9,14'].includes(key) ? 3 : 1)
        }
    })
})

describe('Circle layout', () => {
    it('puts the printed number inside every circle', () => {
        for (const circle of board.circles) {
            const center = circleCenter(circle)
            const number = numberPosition(circle)
            expect(Math.abs(number.x - center.x)).toBeLessThan(1)
            expect(number.y).toBeLessThan(center.y)
            expect(center.y - number.y).toBeLessThan(1.3 * UNIT)
        }
    })

    it('stacks the dolmens from the bottom of the circle upward without leaving it', () => {
        for (const circle of board.circles) {
            const maxHeight =
                circle.shape === 'tetragonal' ? 2 : circle.shape === 'hexagonal' ? 4 : 6
            const layout = stackLayout(circle, maxHeight)
            const ys = layout.map((box) => box.y)
            expect(ys).toEqual([...ys].sort((a, b) => b - a))
            const center = circleCenter(circle)
            const half = circle.shape === 'tetragonal' ? 0.5 : 1.2
            expect(layout[0].y + layout[0].height).toBeLessThanOrEqual(center.y + half * UNIT)
            expect(layout[maxHeight - 1].y).toBeGreaterThan(center.y - half * UNIT)
        }
    })

    it('keeps the stack below the printed number', () => {
        for (const circle of board.circles) {
            const maxHeight =
                circle.shape === 'tetragonal' ? 2 : circle.shape === 'hexagonal' ? 4 : 6
            const top = stackLayout(circle, maxHeight)[maxHeight - 1]
            expect(top.y).toBeGreaterThan(numberPosition(circle).y)
        }
    })
})
