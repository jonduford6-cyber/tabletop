import { describe, expect, it } from 'vitest'
import { AquaduktBoard, Board } from './board.js'
import { REGION_MAP } from '../definition/regionMap.js'

const EXPECTED_REGION_SIZES: Record<number, number> = {
    1: 5,
    2: 4,
    3: 4,
    4: 4,
    5: 5,
    6: 4,
    7: 6,
    8: 4,
    9: 6,
    10: 4,
    11: 4,
    12: 6,
    13: 4,
    14: 6,
    15: 4,
    16: 5,
    17: 4,
    18: 4,
    19: 4,
    20: 5
}

describe('Board region map', () => {
    it('has 92 playable squares in 20 regions of 4, 5 or 6 squares', () => {
        expect(Board.playableSquares).toHaveLength(92)
        for (let region = 1; region <= 20; region++) {
            expect(Board.regionSize(region)).toBe(EXPECTED_REGION_SIZES[region])
        }
    })

    it('makes the four corner cells unplayable', () => {
        for (const square of [
            { row: 1, col: 1 },
            { row: 1, col: 12 },
            { row: 8, col: 1 },
            { row: 8, col: 12 }
        ]) {
            expect(Board.isPlayable(square)).toBe(false)
        }
    })

    it('looks up the region of a square', () => {
        expect(Board.regionOf({ row: 2, col: 1 })).toBe(1)
        expect(Board.regionOf({ row: 4, col: 10 })).toBe(9)
        expect(Board.regionOf({ row: 7, col: 12 })).toBe(20)
    })

    it('rejects squares outside the board', () => {
        expect(Board.isPlayable({ row: 0, col: 5 })).toBe(false)
        expect(Board.isPlayable({ row: 9, col: 5 })).toBe(false)
        expect(Board.isPlayable({ row: 4, col: 13 })).toBe(false)
    })

    it('reads its layout from the region map data', () => {
        const rebuilt = new AquaduktBoard(REGION_MAP)
        expect(rebuilt.playableSquares).toEqual(Board.playableSquares)
    })

    it('rejects a region map with the wrong shape', () => {
        expect(() => new AquaduktBoard(REGION_MAP.slice(1))).toThrow(/8 rows/)
        expect(() => new AquaduktBoard(REGION_MAP.map((row) => row.slice(3)))).toThrow(/12 cells/)
    })

    it('rejects a region map that skips a region', () => {
        const withoutRegionTwenty = REGION_MAP.map((row) => row.replaceAll('20', '19'))
        expect(() => new AquaduktBoard(withoutRegionTwenty)).toThrow(/regions 1 to 20/)
    })
})
