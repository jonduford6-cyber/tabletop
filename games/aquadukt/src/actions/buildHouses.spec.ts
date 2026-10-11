import { describe, expect, it } from 'vitest'
import { ActionType } from '../definition/actions.js'
import { MachineState } from '../definition/states.js'
import { EdgeOrientation } from '../components/geometry.js'
import {
    activePlayerId,
    endTurn,
    hydrate,
    metadataOf,
    newTestGame,
    placeHouse,
    rollDie,
    rollingRegions,
    validActionTypes,
    withState,
    withTiles,
    type TestGame
} from '../util/testHelper.js'

function emptyBoardGame(numPlayers = 2): TestGame {
    return withState(newTestGame(numPlayers), { mountains: [] })
}

function suppliedRegionTwelve(test: TestGame): TestGame {
    return withState(test, {
        springs: [{ row: 4, col: 3 }],
        canals: [{ orientation: EdgeOrientation.Vertical, row: 4, col: 3, count: 1 }]
    })
}

function rolled(test: TestGame, region: number): TestGame {
    return rollDie(rollingRegions(test, region))
}

describe('Building houses: rolling the die', () => {
    it('offers rolling for houses at the start of a turn', () => {
        expect(validActionTypes(emptyBoardGame())).toContain(ActionType.RollDie)
    })

    it('selects the region shown on the die', () => {
        const test = rolled(emptyBoardGame(), 7)
        expect(test.state.rolledRegion).toBe(7)
        expect(test.state.machineState).toBe(MachineState.HouseRolled)
        expect(metadataOf(test)).toEqual({ region: 7, skippedFullRegions: [] })
    })

    it('can roll every region from 1 to 20', () => {
        for (const region of [1, 10, 20]) {
            expect(rolled(emptyBoardGame(), region).state.rolledRegion).toBe(region)
        }
    })

    it('rolls again, without using up a roll, when the region is full of mountains', () => {
        const base = emptyBoardGame()
        const region3 = [
            { row: 1, col: 6 },
            { row: 1, col: 7 },
            { row: 2, col: 6 },
            { row: 2, col: 7 }
        ]
        const skipping = rollDie(rollingRegions(withState(base, { mountains: region3 }), 3, 9))
        expect(skipping.state.rolledRegion).toBe(9)
        expect(metadataOf(skipping)).toEqual({ region: 9, skippedFullRegions: [3] })
        expect(skipping.state.housesPlacedThisTurn).toBe(0)
    })

    it('rolls again when the region is full of houses', () => {
        const base = emptyBoardGame()
        const owner = base.state.players[0].playerId
        const houses = [
            { row: 1, col: 6 },
            { row: 1, col: 7 },
            { row: 2, col: 6 },
            { row: 2, col: 7 }
        ].map((square) => ({ ...square, playerId: owner, value: 1 }))
        const test = rollDie(rollingRegions(withState(base, { houses }), 3, 12))
        expect(test.state.rolledRegion).toBe(12)
    })

    it('is not offered when the player has no house tiles left', () => {
        const base = emptyBoardGame()
        const test = withTiles(base, activePlayerId(base.state), [0, 0, 0, 0])
        expect(validActionTypes(test)).not.toContain(ActionType.RollDie)
        expect(() => rollDie(test)).toThrow()
    })

    it('is not offered when no region has a free square', () => {
        const base = emptyBoardGame()
        const allSquares = Array.from({ length: 20 }, (_, index) =>
            hydrate(base).freeSquaresInRegion(index + 1)
        ).flat()
        const test = withState(base, { mountains: allSquares })
        expect(validActionTypes(test)).not.toContain(ActionType.RollDie)
    })
})

describe('Building houses: placing a tile', () => {
    it('places a chosen tile on a free square in the rolled region', () => {
        const base = rolled(emptyBoardGame(), 7)
        const playerId = activePlayerId(base.state)
        const test = placeHouse(base, 3, 4, 3)
        expect(test.state.houses).toEqual([{ row: 3, col: 4, playerId, value: 3 }])
        expect(hydrate(test).getPlayerState(playerId).tiles).toEqual([8, 8, 7, 4])
        expect(test.state.housesPlacedThisTurn).toBe(1)
        expect(test.state.machineState).toBe(MachineState.HousePlaced)
    })

    it('records the region in the action metadata', () => {
        const test = placeHouse(rolled(emptyBoardGame(), 7), 3, 4, 3)
        expect(metadataOf(test)).toEqual({ region: 7, removedHouses: [] })
    })

    it('rejects a square outside the rolled region', () => {
        const base = rolled(emptyBoardGame(), 7)
        expect(() => placeHouse(base, 1, 4, 1)).toThrow(/rolled region/)
    })

    it('rejects a square off the board and a corner rock', () => {
        const base = rolled(emptyBoardGame(), 7)
        expect(() => placeHouse(base, 0, 4, 1)).toThrow(/not on the board/)
        expect(() => placeHouse(base, 1, 1, 1)).toThrow(/not on the board/)
    })

    it('rejects a mountain square', () => {
        const base = withState(emptyBoardGame(), { mountains: [{ row: 3, col: 4 }] })
        expect(() => placeHouse(rolled(base, 7), 3, 4, 1)).toThrow(/not free/)
    })

    it('rejects an occupied square', () => {
        const base = emptyBoardGame()
        const owner = base.state.players[1].playerId
        const test = withState(base, { houses: [{ row: 3, col: 4, playerId: owner, value: 1 }] })
        expect(() => placeHouse(rolled(test, 7), 3, 4, 1)).toThrow(/not free/)
    })

    it('rejects a tile value the player has run out of', () => {
        const base = emptyBoardGame()
        const test = withTiles(base, activePlayerId(base.state), [0, 8, 8, 4])
        expect(() => placeHouse(rolled(test, 7), 3, 4, 1)).toThrow(/no such house tile/)
    })

    it('rejects a tile value outside 1 to 4', () => {
        expect(() => placeHouse(rolled(emptyBoardGame(), 7), 3, 4, 5)).toThrow(/no such house tile/)
    })

    it('rejects placing before the die has been rolled', () => {
        expect(() => placeHouse(emptyBoardGame(), 3, 4, 1)).toThrow(/not valid in state/)
    })
})

describe('Building houses: lowest-value rule on supplied squares', () => {
    const supplied = { row: 5, col: 3 }
    const unsupplied = { row: 6, col: 5 }

    it('requires a lowest-value tile on a supplied square', () => {
        const base = rolled(suppliedRegionTwelve(emptyBoardGame()), 12)
        expect(() => placeHouse(base, supplied.row, supplied.col, 3)).toThrow(/lowest-value/)
        expect(() => placeHouse(base, supplied.row, supplied.col, 4)).toThrow(/lowest-value/)
        const placed = placeHouse(base, supplied.row, supplied.col, 1)
        expect(placed.state.houses).toHaveLength(1)
    })

    it('moves up to the next value once the lowest tiles are used up', () => {
        const start = emptyBoardGame()
        const test = withTiles(start, activePlayerId(start.state), [0, 2, 2, 1])
        const base = rolled(suppliedRegionTwelve(test), 12)
        expect(() => placeHouse(base, supplied.row, supplied.col, 3)).toThrow(/lowest-value/)
        expect(placeHouse(base, supplied.row, supplied.col, 2).state.houses).toHaveLength(1)
    })

    it('allows any tile on an unsupplied square', () => {
        const base = rolled(suppliedRegionTwelve(emptyBoardGame()), 12)
        for (const value of [1, 2, 3, 4]) {
            const placed = placeHouse(base, unsupplied.row, unsupplied.col, value)
            expect(placed.state.houses[0].value).toBe(value)
        }
    })

    it('applies to the player placing the tile, not to other players', () => {
        const start = emptyBoardGame()
        const other = start.state.players.find((p) => p.playerId !== activePlayerId(start.state))
        expect(other).toBeDefined()
        const test = withTiles(start, activePlayerId(start.state), [0, 8, 8, 4])
        const base = rolled(suppliedRegionTwelve(test), 12)
        expect(() => placeHouse(base, supplied.row, supplied.col, 1)).toThrow()
        expect(placeHouse(base, supplied.row, supplied.col, 2).state.houses).toHaveLength(1)
    })
})

describe('Building houses: up to three rolls', () => {
    it('lets the player roll again after placing a tile or stop', () => {
        const test = placeHouse(rolled(emptyBoardGame(), 7), 3, 4, 1)
        expect(validActionTypes(test)).toEqual([ActionType.RollDie, ActionType.EndTurn])
    })

    it('ends the turn when the player stops after a placement', () => {
        const base = emptyBoardGame()
        const first = activePlayerId(base.state)
        const test = endTurn(placeHouse(rolled(base, 7), 3, 4, 1))
        expect(activePlayerId(test.state)).not.toBe(first)
        expect(test.state.machineState).toBe(MachineState.StartOfTurn)
        expect(test.state.housesPlacedThisTurn).toBe(0)
    })

    it('ends the turn immediately when the player declines to place after a roll', () => {
        const base = emptyBoardGame()
        const first = activePlayerId(base.state)
        const test = endTurn(rolled(base, 7))
        expect(test.state.houses).toEqual([])
        expect(activePlayerId(test.state)).not.toBe(first)
        expect(test.state.machineState).toBe(MachineState.StartOfTurn)
    })

    it('offers only placing or ending the turn after a roll', () => {
        expect(validActionTypes(rolled(emptyBoardGame(), 7))).toEqual([
            ActionType.PlaceHouse,
            ActionType.EndTurn
        ])
    })

    it('ends the turn automatically after the third placement', () => {
        const base = emptyBoardGame()
        const first = activePlayerId(base.state)
        let test = base
        test = placeHouse(rolled(test, 7), 3, 3, 1)
        test = placeHouse(rolled(test, 7), 3, 4, 1)
        expect(activePlayerId(test.state)).toBe(first)
        test = placeHouse(rolled(test, 7), 3, 5, 1)
        expect(test.state.houses).toHaveLength(3)
        expect(activePlayerId(test.state)).not.toBe(first)
        expect(test.state.machineState).toBe(MachineState.StartOfTurn)
        expect(test.state.housesPlacedThisTurn).toBe(0)
    })

    it('ends the turn automatically when the player has no tiles left to place', () => {
        const base = emptyBoardGame()
        const first = activePlayerId(base.state)
        const test = withTiles(base, first, [1, 0, 0, 0])
        const after = placeHouse(rolled(test, 7), 3, 4, 1)
        expect(activePlayerId(after.state)).not.toBe(first)
    })

    it('cannot roll in the same turn as a spring or canal action', () => {
        const test = rolled(emptyBoardGame(), 7)
        expect(validActionTypes(test)).not.toContain(ActionType.PlaceSpring)
        expect(validActionTypes(test)).not.toContain(ActionType.PlaceCanal)
    })
})
