import { describe, expect, it } from 'vitest'
import { EdgeOrientation } from '../components/geometry.js'
import {
    activePlayerId,
    hydrate,
    metadataOf,
    newTestGame,
    otherPlayerId,
    placeHouse,
    rollDie,
    rollingRegions,
    withState,
    type TestGame
} from '../util/testHelper.js'

const SUPPLYING_CANAL = { orientation: EdgeOrientation.Vertical, row: 2, col: 1, count: 1 }

function regionSixSetup(houses: { row: number; col: number; value: number }[]): TestGame {
    const base = withState(newTestGame(2), { mountains: [] })
    const owner = otherPlayerId(base.state)
    return withState(base, {
        springs: [{ row: 2, col: 1 }],
        canals: [SUPPLYING_CANAL],
        houses: houses.map((house) => ({ ...house, playerId: owner }))
    })
}

function placeLastTile(test: TestGame, row: number, col: number, value: number): TestGame {
    return placeHouse(rollDie(rollingRegions(test, 6)), row, col, value)
}

describe('Full regions', () => {
    const threeHouses = [
        { row: 3, col: 1, value: 2 },
        { row: 3, col: 2, value: 3 },
        { row: 4, col: 1, value: 1 }
    ]

    it('removes unsupplied houses when the last free square is filled', () => {
        const test = placeLastTile(regionSixSetup(threeHouses), 4, 2, 4)
        expect(test.state.houses.map((house) => [house.row, house.col])).toEqual([
            [3, 1],
            [3, 2]
        ])
    })

    it('removes the tile that was just placed if it is not supplied', () => {
        const test = placeLastTile(regionSixSetup(threeHouses), 4, 2, 4)
        expect(metadataOf(test)).toMatchObject({
            region: 6,
            removedHouses: [
                { row: 4, col: 1, value: 1 },
                { row: 4, col: 2, value: 4 }
            ]
        })
    })

    it('keeps supplied houses until the end of the game', () => {
        const test = placeLastTile(regionSixSetup(threeHouses), 4, 2, 4)
        const kept = test.state.houses.map((house) => house.value)
        expect(kept).toEqual([2, 3])
    })

    it('does not return removed tiles to their owners', () => {
        const base = regionSixSetup(threeHouses)
        const placer = activePlayerId(base.state)
        const test = placeLastTile(base, 4, 2, 4)
        expect(hydrate(test).getPlayerState(placer).tiles).toEqual([8, 8, 8, 3])
    })

    it('lets players place on the vacated squares afterwards', () => {
        const test = placeLastTile(regionSixSetup(threeHouses), 4, 2, 4)
        const state = hydrate(test)
        expect(state.isRegionFull(6)).toBe(false)
        expect(state.freeSquaresInRegion(6)).toHaveLength(2)
    })

    it('keeps every house when all are supplied', () => {
        const supplied = [
            { row: 3, col: 1, value: 2 },
            { row: 4, col: 1, value: 3 },
            { row: 3, col: 2, value: 1 }
        ]
        const base = withState(regionSixSetup(supplied), {
            canals: [SUPPLYING_CANAL, { ...SUPPLYING_CANAL, row: 3, count: 1 }]
        })
        const test = placeLastTile(base, 4, 2, 1)
        expect(test.state.houses).toHaveLength(4)
        expect(metadataOf(test)).toEqual({ region: 6, removedHouses: [] })
    })

    it('only checks the region that was filled', () => {
        const unrelated = { row: 1, col: 2, value: 2 }
        const test = placeLastTile(regionSixSetup([...threeHouses, unrelated]), 4, 2, 4)
        expect(test.state.houses.some((house) => house.row === 1 && house.col === 2)).toBe(true)
    })

    it('does not remove anything while the region still has a free square', () => {
        const base = regionSixSetup(threeHouses.slice(0, 2))
        const test = placeLastTile(base, 4, 2, 4)
        expect(test.state.houses).toHaveLength(3)
        expect(hydrate(test).freeSquaresInRegion(6)).toHaveLength(1)
    })

    it('treats mountains as filled squares', () => {
        const base = withState(regionSixSetup(threeHouses.slice(0, 2)), {
            mountains: [{ row: 4, col: 1 }]
        })
        const test = placeLastTile(base, 4, 2, 4)
        expect(test.state.houses.map((house) => [house.row, house.col])).toEqual([
            [3, 1],
            [3, 2]
        ])
    })

    it('judges supply at the moment the region fills', () => {
        const base = regionSixSetup(threeHouses)
        const placedNothingToSupply = withState(base, { canals: [] })
        const test = placeLastTile(placedNothingToSupply, 4, 2, 4)
        expect(test.state.houses).toEqual([])
    })
})
