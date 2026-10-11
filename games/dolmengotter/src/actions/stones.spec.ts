import { describe, expect, it } from 'vitest'
import { ActionType } from '../definition/actions.js'
import { MachineState } from '../definition/states.js'
import {
    activePlayerId,
    declineStone,
    flight,
    placeStone,
    scenario,
    validActionTypes,
    walk
} from '../util/testHelper.js'

const walked = () =>
    walk(scenario({ druids: { p1: [{ at: [2, 2] }], p2: [{ at: [6, 4] }] } }), [2, 2], [1, 2])

describe('Placing or declining a stone', () => {
    it('offers both choices after a walk', () => {
        expect(validActionTypes(walked()).sort()).toEqual(
            [ActionType.PlaceStone, ActionType.DeclineStone].sort()
        )
    })

    it('puts the stone on the place the druid just left', () => {
        const done = placeStone(walked())
        expect(done.state.stones).toEqual([{ row: 2, col: 2, playerId: 'p1' }])
        expect(done.state.players[0].stones).toBe(11)
        expect(done.state.players[0].points).toBe(4)
        expect(done.state.vacatedPlace).toBeUndefined()
    })

    it('ends the turn when no dolmen is possible and passes to the next player', () => {
        const done = placeStone(walked())
        expect(done.state.machineState).toBe(MachineState.StartOfTurn)
        expect(activePlayerId(done.state)).toBe('p2')
    })

    it('moves the marker back one field when the player declines', () => {
        const done = declineStone(walked())
        expect(done.state.players[0].points).toBe(3)
        expect(done.state.stones).toEqual([])
        expect(done.state.players[0].stones).toBe(12)
        expect(activePlayerId(done.state)).toBe('p2')
    })

    it('puts the stone of a flight on the place the druid left, not where it lands (U3)', () => {
        const test = scenario({ druids: { p1: [{ at: [2, 2], belly: true }] } })
        const done = placeStone(flight(test, [2, 2], [9, 14]))
        expect(done.state.stones).toEqual([{ row: 2, col: 2, playerId: 'p1' }])
    })

    it('applies the same decline penalty after a flight (U3)', () => {
        const test = scenario({ druids: { p1: [{ at: [2, 2], belly: true }] } })
        expect(declineStone(flight(test, [2, 2], [9, 14])).state.players[0].points).toBe(3)
    })

    it('does not let a player decline when the marker is already on field 1 (U19)', () => {
        const test = walk(
            scenario({ druids: { p1: [{ at: [2, 2] }] }, points: { p1: 1 } }),
            [2, 2],
            [1, 2]
        )
        expect(validActionTypes(test)).toEqual([ActionType.PlaceStone])
        expect(() => declineStone(test)).toThrow()
        expect(placeStone(test).state.stones).toHaveLength(1)
    })

    it('lets a player decline with the marker on field 2 and reach field 1', () => {
        const test = walk(
            scenario({ druids: { p1: [{ at: [2, 2] }] }, points: { p1: 2 } }),
            [2, 2],
            [1, 2]
        )
        expect(declineStone(test).state.players[0].points).toBe(1)
    })

    it('asks nothing of a player without stones: the turn ends, the marker stays (U4)', () => {
        const test = scenario({
            druids: { p1: [{ at: [2, 2] }] },
            stoneStock: { p1: 0 }
        })
        const done = walk(test, [2, 2], [1, 2])
        expect(done.state.machineState).toBe(MachineState.StartOfTurn)
        expect(activePlayerId(done.state)).toBe('p2')
        expect(done.state.players[0].points).toBe(4)
        expect(done.state.stones).toEqual([])
        expect(done.state.vacatedPlace).toBeUndefined()
    })

    it('lets a player without stones still use all three actions (U4)', () => {
        const test = scenario({
            druids: { p1: [{ at: [2, 2] }, { at: [4, 3], belly: true }] },
            stoneStock: { p1: 0 }
        })
        expect(validActionTypes(test).sort()).toEqual(
            [ActionType.Walk, ActionType.CollectHerbs, ActionType.Flight].sort()
        )
    })

    it('does not accept a second stone decision for the same move', () => {
        const done = placeStone(walked())
        expect(() =>
            placeStone({ ...done, state: { ...done.state, activePlayerIds: ['p1'] } })
        ).toThrow()
    })
})
