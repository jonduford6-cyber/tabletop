import { describe, expect, it } from 'vitest'
import { ActionType } from '../definition/actions.js'
import { MachineState } from '../definition/states.js'
import { EdgeOrientation } from '../components/geometry.js'
import { canalsRemaining, type Canal } from '../components/canals.js'
import {
    activePlayerId,
    endTurn,
    hydrate,
    metadataOf,
    newTestGame,
    placeCanal,
    rollDie,
    rollingRegions,
    validActionTypes,
    withState,
    type TestGame
} from '../util/testHelper.js'

const { Horizontal, Vertical } = EdgeOrientation
const spring = { row: 4, col: 6 }

function withSpring(numPlayers = 3): TestGame {
    return withState(newTestGame(numPlayers), { springs: [spring] })
}

function fillerCanals(pieces: number): Canal[] {
    const canals: Canal[] = []
    for (let col = 0; col < 12 && pieces > 0; col++) {
        const count = Math.min(2, pieces)
        canals.push({ orientation: Horizontal, row: 8, col, count })
        pieces -= count
    }
    for (let row = 0; row < 8 && pieces > 0; row++) {
        const count = Math.min(2, pieces)
        canals.push({ orientation: Vertical, row, col: 12, count })
        pieces -= count
    }
    return canals
}

describe('Building canals: availability', () => {
    it('is not offered before any spring has been discovered', () => {
        const base = newTestGame(3)
        expect(validActionTypes(base)).not.toContain(ActionType.PlaceCanal)
        expect(() => placeCanal(base, Vertical, 3, 6)).toThrow(/not valid in state/)
    })

    it('is offered once a spring exists', () => {
        expect(validActionTypes(withSpring())).toContain(ActionType.PlaceCanal)
    })

    it('is not offered when no canals are left', () => {
        const base = withState(withSpring(), { canals: fillerCanals(36) })
        expect(validActionTypes(base)).not.toContain(ActionType.PlaceCanal)
    })

    it('cannot be done after rolling the die in the same turn', () => {
        const base = rollDie(rollingRegions(withSpring(), 7))
        expect(() => placeCanal(base, Vertical, 3, 6)).toThrow(/not valid in state/)
    })
})

describe('Building canals: one or two per turn', () => {
    it('lets the player place a single canal and end the turn', () => {
        const base = withSpring()
        const first = activePlayerId(base.state)
        const afterOne = placeCanal(base, Vertical, 3, 6)
        expect(afterOne.state.machineState).toBe(MachineState.CanalPlaced)
        expect(validActionTypes(afterOne)).toEqual([ActionType.PlaceCanal, ActionType.EndTurn])
        const next = endTurn(afterOne)
        expect(activePlayerId(next.state)).not.toBe(first)
        expect(next.state.canalsPlacedThisTurn).toBe(0)
    })

    it('ends the turn automatically after the second canal', () => {
        const base = withSpring()
        const first = activePlayerId(base.state)
        const afterTwo = placeCanal(placeCanal(base, Vertical, 3, 6), Horizontal, 3, 6)
        expect(afterTwo.state.canals).toHaveLength(2)
        expect(activePlayerId(afterTwo.state)).not.toBe(first)
        expect(afterTwo.state.machineState).toBe(MachineState.StartOfTurn)
    })

    it('places the second canal on the same edge to make a double canal', () => {
        const afterTwo = placeCanal(placeCanal(withSpring(), Vertical, 3, 6), Vertical, 3, 6)
        expect(afterTwo.state.canals).toEqual([{ orientation: Vertical, row: 3, col: 6, count: 2 }])
        expect(canalsRemaining(afterTwo.state.canals)).toBe(34)
    })

    it('records the canal count of the edge in the action metadata', () => {
        const afterOne = placeCanal(withSpring(), Vertical, 3, 6)
        expect(metadataOf(afterOne)).toEqual({ edgeCanalCount: 1 })
        const afterTwo = placeCanal(afterOne, Vertical, 3, 6)
        expect(metadataOf(afterTwo)).toEqual({ edgeCanalCount: 2 })
    })

    it('lets the two canals of a turn go to different systems', () => {
        const base = withState(newTestGame(3), {
            springs: [spring, { row: 0, col: 0 }]
        })
        const test = placeCanal(placeCanal(base, Vertical, 3, 6), Horizontal, 0, 0)
        expect(test.state.canals).toHaveLength(2)
    })

    it('lets the second canal extend the first', () => {
        const test = placeCanal(placeCanal(withSpring(), Vertical, 3, 6), Horizontal, 3, 6)
        expect(test.state.canals.map((canal) => canal.orientation)).toEqual([Vertical, Horizontal])
    })

    it('ends the turn after one canal when it was the last canal', () => {
        const base = withState(withSpring(), { canals: fillerCanals(35) })
        const first = activePlayerId(base.state)
        const afterOne = placeCanal(base, Vertical, 3, 6)
        expect(canalsRemaining(afterOne.state.canals)).toBe(0)
        expect(afterOne.state.machineState).toBe(MachineState.StartOfTurn)
        expect(activePlayerId(afterOne.state)).not.toBe(first)
    })

    it('lets the player place a second canal when one canal is still left', () => {
        const base = withState(withSpring(), { canals: fillerCanals(34) })
        const afterOne = placeCanal(base, Vertical, 3, 6)
        expect(canalsRemaining(afterOne.state.canals)).toBe(1)
        expect(afterOne.state.machineState).toBe(MachineState.CanalPlaced)
    })
})

describe('Building canals: constraints through the engine', () => {
    it('rejects a canal that touches no spring or canal', () => {
        expect(() => placeCanal(withSpring(), Horizontal, 1, 1)).toThrow(
            /start at a spring or the end of a canal/
        )
    })

    it('rejects a third arm from a spring', () => {
        const base = withState(withSpring(), {
            canals: [
                { orientation: Vertical, row: 3, col: 6, count: 1 },
                { orientation: Vertical, row: 4, col: 6, count: 1 }
            ]
        })
        expect(() => placeCanal(base, Horizontal, 4, 6)).toThrow(/at most two canal arms/)
    })

    it('rejects a branch', () => {
        const base = withState(withSpring(), {
            canals: [
                { orientation: Horizontal, row: 4, col: 6, count: 1 },
                { orientation: Vertical, row: 4, col: 7, count: 1 }
            ]
        })
        expect(() => placeCanal(base, Horizontal, 4, 7)).toThrow(/cannot branch off/)
    })

    it('rejects a canal that joins two springs systems', () => {
        const base = withState(newTestGame(3), {
            springs: [spring, { row: 4, col: 11 }],
            canals: [
                { orientation: Horizontal, row: 4, col: 6, count: 1 },
                { orientation: Horizontal, row: 4, col: 7, count: 1 },
                { orientation: Horizontal, row: 4, col: 10, count: 1 },
                { orientation: Horizontal, row: 4, col: 9, count: 1 }
            ]
        })
        expect(() => placeCanal(base, Horizontal, 4, 8)).toThrow(/join two systems/)
    })

    it('rejects a double canal downstream of a single canal', () => {
        const base = withState(withSpring(), {
            canals: [
                { orientation: Vertical, row: 3, col: 6, count: 1 },
                { orientation: Horizontal, row: 3, col: 6, count: 1 }
            ]
        })
        expect(() => placeCanal(base, Horizontal, 3, 6)).toThrow(/must start at a spring/)
    })

    it('rejects a third canal on one edge', () => {
        const base = withState(withSpring(), {
            canals: [{ orientation: Vertical, row: 3, col: 6, count: 2 }]
        })
        expect(() => placeCanal(base, Vertical, 3, 6)).toThrow(/already has a double canal/)
    })

    it('rejects a canal edge off the board', () => {
        const base = withState(newTestGame(3), { springs: [{ row: 0, col: 11 }] })
        expect(() => placeCanal(base, Horizontal, 0, 12)).toThrow(/not on the board/)
    })
})

describe('Building canals: supplying houses', () => {
    it('supplies a house on a square next to a new canal', () => {
        const base = withSpring()
        const owner = activePlayerId(base.state)
        const withHouse = withState(base, {
            houses: [{ row: 4, col: 6, playerId: owner, value: 2 }]
        })
        expect(hydrate(withHouse).isSupplied({ row: 4, col: 6 })).toBe(false)
        const test = placeCanal(withHouse, Vertical, 3, 6)
        expect(hydrate(test).isSupplied({ row: 4, col: 6 })).toBe(true)
    })

    it('supplies two squares each side once the edge is a double canal', () => {
        const test = placeCanal(placeCanal(withSpring(), Vertical, 3, 6), Vertical, 3, 6)
        const state = hydrate(test)
        for (const col of [5, 6, 7, 8]) {
            expect(state.isSupplied({ row: 4, col })).toBe(true)
        }
        expect(state.isSupplied({ row: 4, col: 4 })).toBe(false)
    })
})
