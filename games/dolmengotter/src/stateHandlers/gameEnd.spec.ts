import { GameResult } from '@tabletop/common'
import { describe, expect, it } from 'vitest'
import { MachineState } from '../definition/states.js'
import { winnersOf } from '../util/winners.js'
import {
    activePlayerId,
    collectHerbs,
    declineDolmen,
    flight,
    freeFarPlace,
    hydrate,
    placeDolmen,
    placeStone,
    scenario,
    stoneBy,
    withState,
    type TestGame
} from '../util/testHelper.js'

const OCTAGON = 18
const SQUARE_5 = 5

const upright = (at: [number, number]) => [{ at }]

function lastDolmenScenario(): TestGame {
    return scenario({
        numPlayers: 3,
        dolmens: { p1: [2] },
        druids: { p2: upright([6, 4]), p3: upright([7, 3]) },
        stones: [
            { at: [0, 5], playerId: 'p1' },
            { at: [0, 6], playerId: 'p2' }
        ]
    })
}

describe('Game end: a player has placed their last dolmen', () => {
    it('lets every other player make one last move, clockwise, and then ends the game', () => {
        let test = placeDolmen(stoneBy(lastDolmenScenario(), 'p1', [1, 4]), OCTAGON, 2)
        expect(test.state.endTriggeredBy).toBe('p1')
        expect(test.state.machineState).toBe(MachineState.StartOfTurn)
        expect(activePlayerId(test.state)).toBe('p2')
        expect(test.state.lastMoves).toEqual(['p3'])

        test = collectHerbs(test, [6, 4])
        expect(test.state.machineState).toBe(MachineState.StartOfTurn)
        expect(activePlayerId(test.state)).toBe('p3')
        expect(test.state.lastMoves).toEqual([])

        test = collectHerbs(test, [7, 3])
        expect(test.state.machineState).toBe(MachineState.EndOfGame)
        const turns = hydrate(test).turnManager.turnCounts
        expect(turns.p2).toBe(1)
        expect(turns.p3).toBe(1)
    })

    it('does not give the player who placed the last dolmen another move', () => {
        let test = placeDolmen(stoneBy(lastDolmenScenario(), 'p1', [1, 4]), OCTAGON, 2)
        const before = hydrate(test).turnManager.turnCounts.p1
        test = collectHerbs(collectHerbs(test, [6, 4]), [7, 3])
        expect(hydrate(test).turnManager.turnCounts.p1).toBe(before)
    })

    it('scores the dolmens left on the board when the game ends, with the partial-height rule', () => {
        let test = placeDolmen(stoneBy(lastDolmenScenario(), 'p1', [1, 4]), OCTAGON, 2)
        test = collectHerbs(collectHerbs(test, [6, 4]), [7, 3])
        const state = hydrate(test)
        expect(state.circles[OCTAGON].batch).toEqual([])
        expect(state.getPlayerState('p1').points).toBe(4 + 2 * 5)
        expect(state.getPlayerState('p1').scoredValues).toEqual([2])
        expect(state.ending).toBe(true)
    })

    it('finishes the current turn first when the last dolmen comes from a passive majority', () => {
        let test = scenario({
            numPlayers: 3,
            dolmens: { p2: [3] },
            druids: { p1: upright([6, 4]), p3: upright([7, 3]) },
            stones: [
                { at: [0, 5], playerId: 'p2' },
                { at: [0, 6], playerId: 'p2' }
            ]
        })
        test = stoneBy(test, 'p1', [1, 4])
        expect(activePlayerId(test.state)).toBe('p2')
        test = placeDolmen(test, OCTAGON, 3)
        expect(test.state.endTriggeredBy).toBe('p2')
        expect(activePlayerId(test.state)).toBe('p3')
        expect(test.state.lastMoves).toEqual(['p1'])

        test = collectHerbs(test, [7, 3])
        expect(activePlayerId(test.state)).toBe('p1')
        test = collectHerbs(test, [6, 4])
        expect(test.state.machineState).toBe(MachineState.EndOfGame)
        expect(hydrate(test).getPlayerState('p2').points).toBe(4 + 3 * 5)
    })

    it('does not extend the game when a last move makes another player place their last dolmen', () => {
        let test = scenario({
            numPlayers: 3,
            dolmens: { p1: [2], p2: [1] },
            druids: { p2: [{ at: [6, 1], belly: true }], p3: upright([7, 3]) },
            stones: [
                { at: [0, 5], playerId: 'p1' },
                { at: [0, 6], playerId: 'p2' },
                { at: [5, 1], playerId: 'p2' },
                { at: [5, 2], playerId: 'p3' }
            ]
        })
        test = placeDolmen(stoneBy(test, 'p1', [1, 4]), OCTAGON, 2)
        expect(activePlayerId(test.state)).toBe('p2')

        test = placeStone(flight(test, [6, 1], freeFarPlace(test)))
        expect(test.state.machineState).toBe(MachineState.DolmenDecision)
        test = placeDolmen(test, SQUARE_5, 1)
        expect(test.state.endTriggeredBy).toBe('p1')
        expect(hydrate(test).getPlayerState('p2').dolmenCount).toBe(0)
        expect(activePlayerId(test.state)).toBe('p3')

        test = collectHerbs(test, [7, 3])
        expect(test.state.machineState).toBe(MachineState.EndOfGame)
    })

    it('lets a player decline their dolmen instead: then nobody has placed their last one', () => {
        const test = declineDolmen(stoneBy(lastDolmenScenario(), 'p1', [1, 4]), OCTAGON)
        expect(test.state.endTriggeredBy).toBeUndefined()
        expect(test.state.lastMoves).toBeUndefined()
        expect(test.state.machineState).toBe(MachineState.StartOfTurn)
    })
})

describe('Game end: the last stone has been placed', () => {
    const lastStone = (extra: Parameters<typeof scenario>[0] = {}) =>
        scenario({
            numPlayers: 3,
            stoneStock: { p1: 1, p2: 0, p3: 0 },
            druids: { p2: upright([6, 4]), p3: upright([7, 3]) },
            ...extra
        })

    it('ends the game immediately, without last moves for the others', () => {
        const test = stoneBy(lastStone(), 'p1', [2, 2])
        expect(test.state.machineState).toBe(MachineState.EndOfGame)
        expect(test.state.lastMoves).toBeUndefined()
        expect(hydrate(test).turnManager.turnCounts.p2).toBe(0)
    })

    it('still lets the last stone create dolmens, then scores what is left', () => {
        let test = stoneBy(
            lastStone({
                stones: [
                    { at: [0, 5], playerId: 'p1' },
                    { at: [0, 6], playerId: 'p2' }
                ]
            }),
            'p1',
            [1, 4]
        )
        expect(test.state.machineState).toBe(MachineState.DolmenDecision)
        test = placeDolmen(test, OCTAGON, 4)
        expect(test.state.machineState).toBe(MachineState.EndOfGame)
        expect(hydrate(test).getPlayerState('p1').points).toBe(4 + 4 * 5)
    })

    it('scores the batches left in unfinished circles with the partial-height rule', () => {
        const test = stoneBy(
            lastStone({
                circles: {
                    10: {
                        batch: [
                            { playerId: 'p2', value: 3 },
                            { playerId: 'p3', value: 2 }
                        ]
                    }
                }
            }),
            'p1',
            [4, 0]
        )
        const state = hydrate(test)
        expect(state.getPlayerState('p2').points).toBe(4 + 3 * 4)
        expect(state.getPlayerState('p3').points).toBe(4 + 2 * 3)
        expect(state.circles.every((circle) => circle.batch.length === 0)).toBe(true)
    })

    it('ends the game when the last stone is placed at the same time as the last dolmen', () => {
        const test = placeDolmen(
            stoneBy(
                lastStone({
                    dolmens: { p1: [2] },
                    stones: [
                        { at: [0, 5], playerId: 'p1' },
                        { at: [0, 6], playerId: 'p2' }
                    ]
                }),
                'p1',
                [1, 4]
            ),
            OCTAGON,
            2
        )
        expect(test.state.machineState).toBe(MachineState.EndOfGame)
        expect(test.state.lastMoves).toBeUndefined()
    })
})

describe('Winner and tie-breaks', () => {
    const players = (rows: [number, number][]) => ({
        players: rows.map(([points, dolmensPlaced], index) => ({
            playerId: `p${index + 1}`,
            points,
            dolmensPlaced
        }))
    })

    it('goes to the player with the most points', () => {
        expect(
            winnersOf(
                players([
                    [10, 0],
                    [12, 0],
                    [11, 5]
                ])
            )
        ).toEqual(['p2'])
    })

    it('breaks a tie with the player who built the most dolmens (U17)', () => {
        expect(
            winnersOf(
                players([
                    [12, 3],
                    [12, 5],
                    [9, 9]
                ])
            )
        ).toEqual(['p2'])
    })

    it('shares the victory when points and built dolmens are equal', () => {
        expect(
            winnersOf(
                players([
                    [12, 4],
                    [12, 4],
                    [9, 9]
                ])
            )
        ).toEqual(['p1', 'p2'])
    })

    const finish = (change: (test: TestGame) => TestGame) =>
        stoneBy(
            change(
                scenario({
                    numPlayers: 3,
                    stoneStock: { p1: 1, p2: 0, p3: 0 }
                })
            ),
            'p1',
            [2, 2]
        )

    it('reports a single winner as a win', () => {
        const test = finish((game) =>
            withState(game, (state) => {
                state.getPlayerState('p3').points = 20
            })
        )
        expect(test.state.winningPlayerIds).toEqual(['p3'])
        expect(test.state.result).toBe(GameResult.Win)
    })

    it('reports a shared victory as a draw', () => {
        const test = finish((game) => game)
        expect(test.state.winningPlayerIds.sort()).toEqual(['p1', 'p2', 'p3'])
        expect(test.state.result).toBe(GameResult.Draw)
    })

    it('uses the built dolmens when points are equal at the end of the game', () => {
        const test = finish((game) =>
            withState(game, (state) => {
                state.getPlayerState('p2').dolmensPlaced = 2
            })
        )
        expect(test.state.winningPlayerIds).toEqual(['p2'])
        expect(test.state.result).toBe(GameResult.Win)
    })
})
