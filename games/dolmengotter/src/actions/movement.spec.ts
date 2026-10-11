import { createAction } from '@tabletop/common'
import { describe, expect, it } from 'vitest'
import { Walk } from './walk.js'
import { board, placeKey } from '../components/board.js'
import { ActionType } from '../definition/actions.js'
import { MachineState } from '../definition/states.js'
import { walkDestinations } from '../util/moves.js'
import {
    activePlayerId,
    collectHerbs,
    declineStone,
    execute,
    flight,
    hydrate,
    scenario,
    spotOf,
    validActionTypes,
    walk,
    type Spot
} from '../util/testHelper.js'

const keys = (spots: readonly { row: number; col: number }[]) => spots.map(placeKey).sort()

describe('Walk', () => {
    it('moves a druid to a neighbouring free stone place', () => {
        const test = scenario({ druids: { p1: [{ at: [2, 2] }] } })
        const moved = walk(test, [2, 2], [1, 2])
        expect(moved.state.players[0].druids).toEqual([{ row: 1, col: 2, belly: false }])
        expect(moved.state.machineState).toBe(MachineState.StoneDecision)
        expect(activePlayerId(moved.state)).toBe('p1')
        expect(moved.state.vacatedPlace).toEqual({ row: 2, col: 2 })
    })

    it('does not move a druid to a place that is not a neighbour', () => {
        const test = scenario({ druids: { p1: [{ at: [2, 2] }] } })
        expect(() => walk(test, [2, 2], [4, 3])).toThrow('cannot walk')
    })

    it('does not move a druid onto a stone', () => {
        const test = scenario({
            druids: { p1: [{ at: [2, 2] }] },
            stones: [{ at: [1, 2], playerId: 'p2' }]
        })
        expect(() => walk(test, [2, 2], [1, 2])).toThrow('cannot walk')
    })

    it('does not move a druid onto another druid', () => {
        const test = scenario({
            druids: { p1: [{ at: [2, 2] }], p2: [{ at: [1, 2] }] }
        })
        expect(() => walk(test, [2, 2], [1, 2])).toThrow('cannot walk')
    })

    it("moves only the active player's own druids", () => {
        const test = scenario({ druids: { p1: [{ at: [2, 2] }], p2: [{ at: [4, 3] }] } })
        expect(() => walk(test, [4, 3], [3, 3])).toThrow('no druid')
    })

    it('does not move a druid that lies on its belly (U2)', () => {
        const test = scenario({
            druids: { p1: [{ at: [2, 2], belly: true }, { at: [4, 3] }] }
        })
        expect(() => walk(test, [2, 2], [1, 2])).toThrow('only fly')
    })

    it('skips a neighbouring druid of any player and lands on a free place next to it (U10)', () => {
        const test = scenario({
            druids: { p1: [{ at: [2, 2] }], p2: [{ at: [3, 3] }] }
        })
        const reachable = walkDestinations(hydrate(test).occupancy, { row: 2, col: 2 })
        expect(keys(reachable)).toEqual(
            keys([
                { row: 1, col: 2 },
                { row: 2, col: 1 },
                ...board.neighbours({ row: 3, col: 3 }).filter((p) => placeKey(p) !== '2,2')
            ])
        )
        const moved = walk(test, [2, 2], [2, 4])
        expect(moved.state.players[0].druids[0]).toEqual({ row: 2, col: 4, belly: false })
    })

    it('skips your own druid too', () => {
        const test = scenario({ druids: { p1: [{ at: [2, 2] }, { at: [3, 3] }] } })
        expect(() => walk(test, [2, 2], [2, 4])).not.toThrow()
    })

    it('skips a druid lying on its belly (U1)', () => {
        const test = scenario({
            druids: { p1: [{ at: [2, 2] }], p2: [{ at: [3, 3], belly: true }] }
        })
        expect(() => walk(test, [2, 2], [2, 4])).not.toThrow()
    })

    it('skips a row of druids (U10)', () => {
        const test = scenario({
            druids: { p1: [{ at: [2, 2] }], p2: [{ at: [3, 3] }, { at: [4, 3] }] }
        })
        const moved = walk(test, [2, 2], [5, 4])
        expect(moved.state.players[0].druids[0]).toEqual({ row: 5, col: 4, belly: false })
    })

    it('does not skip a stone', () => {
        const test = scenario({
            druids: { p1: [{ at: [2, 2] }] },
            stones: [{ at: [3, 3], playerId: 'p2' }]
        })
        expect(() => walk(test, [2, 2], [2, 4])).toThrow('cannot walk')
    })

    it('does not skip a free stone place', () => {
        const test = scenario({ druids: { p1: [{ at: [2, 2] }] } })
        expect(() => walk(test, [2, 2], [2, 4])).toThrow('cannot walk')
    })

    it('does not land on a place that holds a stone beyond a druid', () => {
        const test = scenario({
            druids: { p1: [{ at: [2, 2] }], p2: [{ at: [3, 3] }] },
            stones: [{ at: [2, 4], playerId: 'p2' }]
        })
        expect(() => walk(test, [2, 2], [2, 4])).toThrow('cannot walk')
    })

    it('walks from a border place to the linked place on the opposite side', () => {
        const test = scenario({ druids: { p1: [{ at: [3, 0] }] } })
        const moved = walk(test, [3, 0], [3, 15])
        expect(moved.state.players[0].druids[0]).toEqual({ row: 3, col: 15, belly: false })
        expect(() =>
            walk(scenario({ druids: { p1: [{ at: [0, 3] }] } }), [0, 3], [8, 3])
        ).not.toThrow()
    })

    it('walks from a corner to any of the other three corners', () => {
        const targets: Spot[] = [
            [1, 14],
            [9, 1],
            [9, 14]
        ]
        for (const target of targets) {
            const test = scenario({ druids: { p1: [{ at: [1, 1] }] } })
            expect(() => walk(test, [1, 1], target)).not.toThrow()
        }
    })

    it('skips a druid standing on a linked border place', () => {
        const test = scenario({
            druids: { p1: [{ at: [3, 0] }], p2: [{ at: [3, 15] }] }
        })
        const reachable = walkDestinations(hydrate(test).occupancy, { row: 3, col: 0 })
        expect(keys(reachable)).toEqual(expect.arrayContaining(['2,14', '4,15']))
    })

    it('cannot be offered when no druid has a free place to walk to', () => {
        const around = board.neighbours({ row: 1, col: 1 })
        const test = scenario({
            druids: { p1: [{ at: [1, 1] }] },
            stones: around.map((place) => ({ at: spotOf(place), playerId: 'p2' }))
        })
        expect(validActionTypes(test)).toEqual([ActionType.CollectHerbs])
    })
})

describe('Collect herbs', () => {
    it('turns an upright druid onto its belly without moving it', () => {
        const test = scenario({ druids: { p1: [{ at: [2, 2] }] } })
        const done = collectHerbs(test, [2, 2])
        expect(done.state.players[0].druids).toEqual([{ row: 2, col: 2, belly: true }])
    })

    it('places no stone and costs no points, and ends the turn (U21)', () => {
        const test = scenario({ druids: { p1: [{ at: [2, 2] }] } })
        const done = collectHerbs(test, [2, 2])
        expect(done.state.machineState).toBe(MachineState.StartOfTurn)
        expect(activePlayerId(done.state)).toBe('p2')
        expect(done.state.players[0].points).toBe(4)
        expect(done.state.players[0].stones).toBe(12)
        expect(done.state.stones).toEqual([])
    })

    it('cannot be done with a druid that is already on its belly (U21)', () => {
        const test = scenario({
            druids: { p1: [{ at: [2, 2], belly: true }, { at: [4, 3] }] }
        })
        expect(() => collectHerbs(test, [2, 2])).toThrow('already lying')
    })

    it('needs a druid on that stone place', () => {
        const test = scenario({ druids: { p1: [{ at: [2, 2] }] } })
        expect(() => collectHerbs(test, [4, 3])).toThrow('no druid')
    })

    it('is not offered when every druid lies on its belly', () => {
        const test = scenario({ druids: { p1: [{ at: [2, 2], belly: true }] } })
        expect(validActionTypes(test)).toEqual([ActionType.Flight])
    })
})

describe('Flight', () => {
    it('moves a druid on its belly to any free stone place and stands it up', () => {
        const test = scenario({ druids: { p1: [{ at: [2, 2], belly: true }] } })
        const flown = flight(test, [2, 2], [9, 14])
        expect(flown.state.players[0].druids).toEqual([{ row: 9, col: 14, belly: false }])
        expect(flown.state.machineState).toBe(MachineState.StoneDecision)
        expect(flown.state.vacatedPlace).toEqual({ row: 2, col: 2 })
    })

    it('can land next to other druids', () => {
        const test = scenario({
            druids: { p1: [{ at: [2, 2], belly: true }], p2: [{ at: [6, 4] }] }
        })
        expect(() => flight(test, [2, 2], [7, 3])).not.toThrow()
    })

    it('cannot land on a stone', () => {
        const test = scenario({
            druids: { p1: [{ at: [2, 2], belly: true }] },
            stones: [{ at: [7, 3], playerId: 'p2' }]
        })
        expect(() => flight(test, [2, 2], [7, 3])).toThrow('not free')
    })

    it('cannot land on another druid', () => {
        const test = scenario({
            druids: { p1: [{ at: [2, 2], belly: true }], p2: [{ at: [7, 3] }] }
        })
        expect(() => flight(test, [2, 2], [7, 3])).toThrow('not free')
    })

    it('cannot land where it started', () => {
        const test = scenario({ druids: { p1: [{ at: [2, 2], belly: true }] } })
        expect(() => flight(test, [2, 2], [2, 2])).toThrow('another place')
    })

    it('cannot land off the board', () => {
        const test = scenario({ druids: { p1: [{ at: [2, 2], belly: true }] } })
        expect(() => flight(test, [2, 2], [0, 0])).toThrow('not a stone place')
    })

    it('cannot be done by a druid standing upright', () => {
        const test = scenario({
            druids: { p1: [{ at: [2, 2] }, { at: [4, 3], belly: true }] }
        })
        expect(() => flight(test, [2, 2], [7, 3])).toThrow('Only a druid')
    })

    it('is offered together with the other actions when druids of both kinds exist', () => {
        const test = scenario({
            druids: { p1: [{ at: [2, 2] }, { at: [4, 3], belly: true }] }
        })
        expect(validActionTypes(test).sort()).toEqual(
            [ActionType.Walk, ActionType.CollectHerbs, ActionType.Flight].sort()
        )
    })

    it('leaves a stone decision for the player afterwards', () => {
        const test = scenario({ druids: { p1: [{ at: [2, 2], belly: true }] } })
        const flown = flight(test, [2, 2], [9, 14])
        expect(declineStone(flown).state.players[0].points).toBe(3)
    })
})

describe('Turns', () => {
    it('allows only the active player to act', () => {
        const test = scenario({ druids: { p1: [{ at: [2, 2] }], p2: [{ at: [4, 3] }] } })
        expect(validActionTypes(test, 'p2')).toEqual([])
        expect(validActionTypes(test, 'p1').length).toBeGreaterThan(0)
    })
})

describe('Out-of-turn actions', () => {
    it('rejects a walk by a player whose turn it is not', () => {
        const test = scenario({ druids: { p1: [{ at: [2, 2] }], p2: [{ at: [4, 3] }] } })
        const action = createAction(Walk, {
            gameId: test.state.gameId,
            playerId: 'p2',
            fromRow: 4,
            fromCol: 3,
            toRow: 3,
            toCol: 3
        })
        expect(() => execute(test, action)).toThrow('not an active player')
    })
})
