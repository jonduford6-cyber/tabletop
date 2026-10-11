import { describe, expect, it } from 'vitest'
import { ActionType } from '../definition/actions.js'
import { MachineState } from '../definition/states.js'
import {
    activePlayerId,
    declineDolmen,
    decideDolmens,
    hydrate,
    placeDolmen,
    scenario,
    stoneBy,
    validActionTypes
} from '../util/testHelper.js'

const SQUARE = 0
const SQUARE_PLACES = [
    [1, 1],
    [2, 1],
    [1, 2],
    [2, 2]
] as const

describe('Initial majority', () => {
    const afterTwoStones = () => {
        let test = scenario({ numPlayers: 3 })
        test = stoneBy(test, 'p2', SQUARE_PLACES[0])
        test = stoneBy(test, 'p1', SQUARE_PLACES[1])
        return test
    }

    it('gives no dolmen while no colour leads', () => {
        const test = afterTwoStones()
        expect(test.state.machineState).toBe(MachineState.StartOfTurn)
        expect(test.state.pendingDolmens).toEqual([])
    })

    it('lets the player with two stones against one place a dolmen in the middle', () => {
        const test = stoneBy(afterTwoStones(), 'p1', SQUARE_PLACES[2])
        expect(test.state.machineState).toBe(MachineState.DolmenDecision)
        expect(activePlayerId(test.state)).toBe('p1')
        expect(validActionTypes(test).sort()).toEqual(
            [ActionType.PlaceDolmen, ActionType.DeclineDolmen].sort()
        )
        const placed = placeDolmen(test, SQUARE, 3)
        expect(placed.state.circles[SQUARE].batch).toEqual([{ playerId: 'p1', value: 3 }])
        expect(placed.state.circles[SQUARE].hadMajority).toBe(true)
    })

    it('takes the placed dolmen from the stock of its owner', () => {
        const test = placeDolmen(stoneBy(afterTwoStones(), 'p1', SQUARE_PLACES[2]), SQUARE, 3)
        const player = test.state.players[0]
        expect(player.dolmenCount).toBe(9)
        expect(player.dolmens).not.toContain(undefined)
        expect(player.dolmens.filter((value) => value === 3)).toHaveLength(1)
        expect(player.dolmensPlaced).toBe(1)
    })

    it('lets the player choose any value they still hold, and only those', () => {
        const test = stoneBy(afterTwoStones(), 'p1', SQUARE_PLACES[2])
        const dolmens = test.state.players[0].dolmens
        expect(dolmens.filter((value) => value === 4)).toHaveLength(1)
        const once = placeDolmen(test, SQUARE, 4)
        expect(once.state.players[0].dolmens).not.toContain(4)
        expect(() =>
            placeDolmen(stoneBy(afterTwoStones(), 'p1', SQUARE_PLACES[2]), SQUARE, 7)
        ).toThrow('no dolmen with that value')
    })

    it('allows declining without any consequence', () => {
        const test = stoneBy(afterTwoStones(), 'p1', SQUARE_PLACES[2])
        const declined = declineDolmen(test, SQUARE)
        expect(declined.state.circles[SQUARE].batch).toEqual([])
        expect(declined.state.players[0].dolmenCount).toBe(10)
        expect(declined.state.players[0].points).toBe(4)
        expect(declined.state.machineState).toBe(MachineState.StartOfTurn)
    })

    it('never lets a declined dolmen be placed afterwards (U8)', () => {
        const declined = declineDolmen(stoneBy(afterTwoStones(), 'p1', SQUARE_PLACES[2]), SQUARE)
        expect(hydrate(declined).pendingDolmens).toEqual([])
        expect(() => placeDolmen(declined, SQUARE, 3)).toThrow()
    })

    it('does not give a second dolmen to a colour that already holds the majority', () => {
        const test = decideDolmens(stoneBy(afterTwoStones(), 'p1', SQUARE_PLACES[2]), 3)
        const next = stoneBy(test, 'p1', SQUARE_PLACES[3])
        expect(next.state.pendingDolmens).toEqual([])
    })
})

describe('Passive majority', () => {
    it('lets the owner of a lone pair place a dolmen when another colour joins the circle', () => {
        let test = scenario({
            numPlayers: 3,
            stones: [
                { at: [1, 1], playerId: 'p2' },
                { at: [2, 1], playerId: 'p2' }
            ]
        })
        test = stoneBy(test, 'p1', [1, 2])
        expect(test.state.machineState).toBe(MachineState.DolmenDecision)
        expect(activePlayerId(test.state)).toBe('p2')
        expect(test.state.pendingDolmens).toEqual([
            { playerId: 'p2', circleId: SQUARE, kind: 'majority' }
        ])
        const placed = placeDolmen(test, SQUARE, 2)
        expect(placed.state.circles[SQUARE].batch).toEqual([{ playerId: 'p2', value: 2 }])
        expect(activePlayerId(placed.state)).toBe('p2')
    })

    it('returns to the turn of the placing player afterwards', () => {
        let test = scenario({
            numPlayers: 3,
            stones: [
                { at: [1, 1], playerId: 'p2' },
                { at: [2, 1], playerId: 'p2' }
            ]
        })
        test = decideDolmens(stoneBy(test, 'p1', [1, 2]), 2)
        expect(test.state.machineState).toBe(MachineState.StartOfTurn)
        expect(activePlayerId(test.state)).toBe('p2')
    })
})

describe('Equalization and further majorities', () => {
    const OCTAGON = 18

    const octagon = (
        batch: { playerId: string; value: number }[],
        stones: [number, number, string][]
    ) =>
        scenario({
            numPlayers: 3,
            stones: stones.map(([row, col, playerId]) => ({ at: [row, col], playerId })),
            circles: { [OCTAGON]: { hadMajority: true, batch } }
        })

    it('lets a colour that catches up place a dolmen under the batch', () => {
        const test = stoneBy(
            octagon(
                [{ playerId: 'p1', value: 3 }],
                [
                    [0, 5, 'p1'],
                    [0, 6, 'p1'],
                    [1, 4, 'p2']
                ]
            ),
            'p2',
            [1, 7]
        )
        expect(test.state.pendingDolmens).toEqual([
            { playerId: 'p2', circleId: OCTAGON, kind: 'equalizer' }
        ])
        const placed = placeDolmen(test, OCTAGON, 1)
        expect(placed.state.circles[OCTAGON].batch).toEqual([
            { playerId: 'p1', value: 3 },
            { playerId: 'p2', value: 1 }
        ])
    })

    it('lets a colour that leaves a tie place a dolmen on top of the batch', () => {
        const test = stoneBy(
            octagon(
                [
                    { playerId: 'p1', value: 3 },
                    { playerId: 'p2', value: 1 }
                ],
                [
                    [0, 5, 'p1'],
                    [0, 6, 'p1'],
                    [1, 4, 'p2'],
                    [1, 7, 'p2']
                ]
            ),
            'p1',
            [2, 4]
        )
        expect(test.state.pendingDolmens).toEqual([
            { playerId: 'p1', circleId: OCTAGON, kind: 'majority' }
        ])
        const placed = placeDolmen(test, OCTAGON, 2)
        expect(placed.state.circles[OCTAGON].batch).toEqual([
            { playerId: 'p1', value: 2 },
            { playerId: 'p1', value: 3 },
            { playerId: 'p2', value: 1 }
        ])
    })

    it('starts the batch when the batch is empty although an equalizer is placed (U13)', () => {
        const test = stoneBy(
            octagon(
                [],
                [
                    [0, 5, 'p1'],
                    [0, 6, 'p1'],
                    [1, 4, 'p2']
                ]
            ),
            'p2',
            [1, 7]
        )
        const placed = placeDolmen(test, OCTAGON, 2)
        expect(placed.state.circles[OCTAGON].batch).toEqual([{ playerId: 'p2', value: 2 }])
    })

    it('gives a third colour that joins a tie an equalizer under the batch', () => {
        const test = stoneBy(
            octagon(
                [
                    { playerId: 'p1', value: 3 },
                    { playerId: 'p2', value: 1 }
                ],
                [
                    [0, 5, 'p1'],
                    [0, 6, 'p1'],
                    [1, 4, 'p2'],
                    [1, 7, 'p2'],
                    [3, 5, 'p3']
                ]
            ),
            'p3',
            [3, 6]
        )
        expect(test.state.pendingDolmens).toEqual([
            { playerId: 'p3', circleId: OCTAGON, kind: 'equalizer' }
        ])
        const placed = placeDolmen(test, OCTAGON, 4)
        expect(placed.state.circles[OCTAGON].batch.map((dolmen) => dolmen.playerId)).toEqual([
            'p1',
            'p2',
            'p3'
        ])
    })
})

describe('Several dolmens from one stone', () => {
    const base = (turnOrder?: string[]) =>
        scenario({
            numPlayers: 3,
            turnOrder,
            stones: [
                { at: [1, 1], playerId: 'p2' },
                { at: [2, 1], playerId: 'p2' },
                { at: [0, 3], playerId: 'p3' },
                { at: [1, 4], playerId: 'p3' }
            ]
        })

    it('creates a right in every circle the stone belongs to, for different players (U5)', () => {
        const test = stoneBy(base(), 'p1', [1, 2])
        const rights = test.state.pendingDolmens.map(
            (right) => `${right.circleId}:${right.playerId}`
        )
        expect(rights.sort()).toEqual(['0:p2', '10:p3'].sort())
    })

    it.each([
        [
            ['p1', 'p2', 'p3'],
            ['p2', 'p3']
        ],
        [
            ['p1', 'p3', 'p2'],
            ['p3', 'p2']
        ],
        [
            ['p3', 'p1', 'p2'],
            ['p2', 'p3']
        ]
    ])('asks the players clockwise from the placing player with order %j (U5)', (order, asked) => {
        const test = stoneBy(base(order), 'p1', [1, 2])
        expect(test.state.pendingDolmens.map((right) => right.playerId)).toEqual(asked)
        expect(activePlayerId(test.state)).toBe(asked[0])
    })

    it('lets each player decide for their own circle before the turn goes on', () => {
        let test = stoneBy(base(), 'p1', [1, 2])
        const [first, second] = test.state.pendingDolmens
        test = placeDolmen(test, first.circleId, 4)
        expect(test.state.machineState).toBe(MachineState.DolmenDecision)
        expect(activePlayerId(test.state)).toBe(second.playerId)
        test = declineDolmen(test, second.circleId)
        expect(test.state.machineState).toBe(MachineState.StartOfTurn)
    })

    it('does not let a player answer for a circle that is not theirs', () => {
        const test = stoneBy(base(), 'p1', [1, 2])
        const [first, second] = test.state.pendingDolmens
        expect(first.playerId).not.toBe(second.playerId)
        expect(() => declineDolmen(test, second.circleId)).toThrow()
        expect(() => placeDolmen(test, second.circleId, 3)).toThrow()
    })

    it('lets one player place in two circles, in the order they choose', () => {
        let test = scenario({
            numPlayers: 2,
            stones: [
                { at: [1, 1], playerId: 'p1' },
                { at: [2, 1], playerId: 'p1' },
                { at: [0, 3], playerId: 'p1' },
                { at: [1, 4], playerId: 'p1' }
            ]
        })
        test = stoneBy(test, 'p2', [1, 2])
        expect(
            test.state.pendingDolmens.map((right) => right.circleId).sort((a, b) => a - b)
        ).toEqual([0, 10])
        test = placeDolmen(test, 10, 1)
        expect(test.state.pendingDolmens.map((right) => right.circleId)).toEqual([0])
        test = placeDolmen(test, 0, 2)
        expect(test.state.circles[0].batch).toHaveLength(1)
        expect(test.state.circles[10].batch).toHaveLength(1)
    })
})

describe('A right without a dolmen', () => {
    it('is lost when the player has no dolmens left (U22)', () => {
        let test = scenario({
            numPlayers: 3,
            dolmens: { p1: [] },
            stones: [
                { at: [2, 1], playerId: 'p2' },
                { at: [1, 1], playerId: 'p1' }
            ]
        })
        test = stoneBy(test, 'p1', [1, 2])
        expect(test.state.pendingDolmens).toEqual([])
        expect(test.state.machineState).toBe(MachineState.StartOfTurn)
        expect(test.state.endTriggeredBy).toBeUndefined()
    })
})
