import { describe, expect, it } from 'vitest'
import { ActionType } from '../definition/actions.js'
import { MachineState } from '../definition/states.js'
import { EdgeOrientation } from '../components/geometry.js'
import {
    activePlayerId,
    newTestGame,
    placeSpring,
    rollDie,
    rollingRegions,
    validActionTypes,
    withState
} from '../util/testHelper.js'

describe('Discovering a spring', () => {
    it('is offered at the start of a turn', () => {
        expect(validActionTypes(newTestGame(3))).toContain(ActionType.PlaceSpring)
    })

    it('places the spring on the chosen intersection and ends the turn', () => {
        const base = newTestGame(3)
        const first = activePlayerId(base.state)
        const test = placeSpring(base, 4, 6)
        expect(test.state.springs).toEqual([{ row: 4, col: 6 }])
        expect(activePlayerId(test.state)).not.toBe(first)
        expect(test.state.machineState).toBe(MachineState.StartOfTurn)
    })

    it('allows a spring inside a region and at the board edge', () => {
        const inside = placeSpring(newTestGame(2), 4, 4)
        const onEdge = placeSpring(inside, 0, 12)
        expect(onEdge.state.springs).toHaveLength(2)
    })

    it('rejects a spring closer than 5 steps to another spring', () => {
        const base = placeSpring(newTestGame(2), 4, 6)
        expect(() => placeSpring(base, 4, 10)).toThrow(/at least 5 steps/)
        expect(() => placeSpring(base, 6, 8)).toThrow(/at least 5 steps/)
    })

    it('accepts a spring exactly 5 steps from another', () => {
        const base = placeSpring(newTestGame(2), 4, 6)
        expect(placeSpring(base, 4, 11).state.springs).toHaveLength(2)
    })

    it('rejects a spring on the same intersection', () => {
        const base = placeSpring(newTestGame(2), 4, 6)
        expect(() => placeSpring(base, 4, 6)).toThrow(/already a spring/)
    })

    it('rejects an intersection off the board', () => {
        expect(() => placeSpring(newTestGame(2), 9, 0)).toThrow(/not on the board/)
    })

    it('rejects an intersection a canal touches', () => {
        const base = withState(newTestGame(2), {
            springs: [{ row: 4, col: 6 }],
            canals: [6, 7, 8, 9, 10].map((col) => ({
                orientation: EdgeOrientation.Horizontal,
                row: 4,
                col,
                count: 1
            }))
        })
        expect(() => placeSpring(base, 4, 11)).toThrow(/canal already touches/)
    })

    it('is not offered once all five springs are placed', () => {
        const springs = [
            { row: 0, col: 0 },
            { row: 0, col: 5 },
            { row: 0, col: 10 },
            { row: 5, col: 0 },
            { row: 5, col: 5 }
        ]
        const base = withState(newTestGame(2), { springs })
        expect(validActionTypes(base)).not.toContain(ActionType.PlaceSpring)
        expect(() => placeSpring(base, 8, 12)).toThrow(/not valid in state/)
    })

    it('cannot be done after rolling the die in the same turn', () => {
        const base = rollDie(rollingRegions(newTestGame(2), 7))
        expect(() => placeSpring(base, 4, 6)).toThrow(/not valid in state/)
    })
})
