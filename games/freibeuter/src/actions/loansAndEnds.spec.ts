import { describe, expect, it } from 'vitest'
import { ActionType } from '../definition/actions.js'
import { MachineState } from '../definition/states.js'
import { CounterKind, EndReason, Pile } from '../model/gameState.js'
import { finalScore, winnersOf } from '../util/scoring.js'
import {
    activePlayerId,
    captureShip,
    draw,
    execute,
    hydrate,
    playSea,
    resolve,
    scenario,
    validActionTypes,
    withState
} from '../util/testHelper.js'
import { createAction } from '@tabletop/common'
import { Pass } from './pass.js'

const ship = (value: number, captorId: string, intersection = 'AB12') => ({
    intersection,
    kind: CounterKind.Ship,
    value,
    captorId
})

const owing = (extra: Parameters<typeof scenario>[0]) =>
    scenario({
        hands: { p1: ['B2'] },
        counters: [ship(20, 'p3')],
        boatsOn: [
            ['A1', 'p2'],
            ['A2', 'p2'],
            ['B1', 'p2']
        ],
        ...extra
    })

describe('Loans', () => {
    it('are not needed when the captor has enough treasure', () => {
        const done = playSea(owing({ treasure: { p3: 100 } }), 'B2')
        expect(done.state.players[2].loans).toBe(0)
        expect(done.state.players[2].treasure).toBe(100 - 16)
        expect(hydrate(done).getPlayerState('p3').blockedBoats).toBe(0)
    })

    it('borrow exactly the missing amount', () => {
        const done = playSea(owing({ treasure: { p3: 10 } }), 'B2')
        expect(done.state.players[2].loans).toBe(6)
        expect(done.state.players[2].treasure).toBe(0)
    })

    it('are borrowed when the captor has no treasure at all', () => {
        const done = playSea(owing({ treasure: { p3: 0 } }), 'B2')
        expect(done.state.players[2].loans).toBe(16)
    })

    it('block exactly one boat, which may no longer be placed', () => {
        const done = playSea(owing({ treasure: { p3: 0 } }), 'B2')
        const captor = hydrate(done).getPlayerState('p3')
        expect(captor.blockedBoats).toBe(1)
        expect(captor.placeableBoats).toBe(captor.boats - 1)
    })

    it('add the new loan to the old one under the same boat', () => {
        const test = owing({ treasure: { p3: 0 }, loans: { p3: 5 } })
        const done = playSea(test, 'B2')
        expect(done.state.players[2].loans).toBe(5 + 16)
        expect(hydrate(done).getPlayerState('p3').blockedBoats).toBe(1)
    })

    it('are repaid at the end of the game at double value', () => {
        const player = { playerId: 'p', treasure: 40, ships: [10], loans: 7 }
        expect(finalScore(player, [])).toBe(40 + 10 - 14)
    })

    it('cannot be repaid early and the loan treasure cannot pay debts', () => {
        const done = playSea(owing({ treasure: { p3: 0 } }), 'B2')
        expect(validActionTypes(done, 'p3')).toEqual([])
        expect(done.state.players[2].treasure).toBe(0)
    })
})

describe('End condition 1: the last pirate chest is surrounded', () => {
    const base = (captured: boolean) =>
        scenario({
            hands: { p1: ['B2'] },
            counters: [
                { intersection: 'AB12', kind: CounterKind.Chest },
                captured
                    ? { intersection: 'AB23', kind: CounterKind.Ship, value: 10, captorId: 'p3' }
                    : { intersection: 'AB23', kind: CounterKind.Ship, value: 10 }
            ],
            boatsOn: [
                ['A1', 'p2'],
                ['A2', 'p2'],
                ['B1', 'p2'],
                ['A3', 'p2'],
                ['B3', 'p2']
            ],
            removedChests: 3
        })

    it('ends the game right after the chest is resolved and paid, without a draw', () => {
        const done = resolve(playSea(base(false), 'B2'), 'AB12')
        expect(done.state.machineState).toBe(MachineState.EndOfGame)
        expect(done.state.endReason).toBe(EndReason.LastChest)
        expect(done.state.players[1].treasure).toBe(22)
        expect(done.state.players[0].hand).toHaveLength(0)
    })

    it('leaves the other surrounded entity unresolved when the chest is resolved first (U7)', () => {
        const done = resolve(playSea(base(true), 'B2'), 'AB12')
        expect(done.state.counters.map((counter) => counter.intersection)).toEqual(['AB23'])
        expect(done.state.surrounded).toEqual(['AB23'])
        expect(done.state.players[2].ships).toEqual([])
    })

    it('lets the player resolve the ship first so that it still pays out (U9)', () => {
        const done = resolve(playSea(base(true), 'B2'), 'AB23')
        expect(done.state.machineState).toBe(MachineState.EndOfGame)
        expect(done.state.players[2].ships).toEqual([10])
        expect(done.state.counters).toEqual([])
    })

    it('does not end the game when fewer than four chests are removed', () => {
        const test = scenario({
            hands: { p1: ['B2'] },
            counters: [{ intersection: 'AB12', kind: CounterKind.Chest }],
            boatsOn: [
                ['A1', 'p2'],
                ['A2', 'p2'],
                ['B1', 'p2']
            ],
            removedChests: 2
        })
        expect(playSea(test, 'B2').state.machineState).toBe(MachineState.Drawing)
    })

    it('declares a winner by the final scoring', () => {
        const done = resolve(playSea(base(false), 'B2'), 'AB12')
        expect(done.state.winningPlayerIds).toEqual(
            ['p1', 'p2'].filter((id) => done.state.winningPlayerIds.includes(id))
        )
        expect(done.state.winningPlayerIds.length).toBeGreaterThan(0)
    })
})

describe('End condition 2: a player must draw and both piles are empty', () => {
    it('ends the game instead of the draw', () => {
        const test = scenario({ hands: { p1: ['A1'] }, seaPile: [], dutchmanPile: [] })
        const done = playSea(test, 'A1')
        expect(done.state.machineState).toBe(MachineState.EndOfGame)
        expect(done.state.endReason).toBe(EndReason.DrawPilesEmpty)
    })

    it('does not end the game when one pile still has cards', () => {
        const test = scenario({ hands: { p1: ['A1'] }, seaPile: [], dutchmanPile: ['col:1'] })
        expect(playSea(test, 'A1').state.machineState).toBe(MachineState.Drawing)
    })

    it('happens at the end of the turn after the entities are resolved', () => {
        const test = scenario({
            hands: { p1: ['B2'] },
            counters: [{ intersection: 'AB12', kind: CounterKind.Doubling, value: 5 }],
            boatsOn: [
                ['A1', 'p2'],
                ['A2', 'p2'],
                ['B1', 'p2']
            ],
            seaPile: [],
            dutchmanPile: []
        })
        const done = playSea(test, 'B2')
        expect(done.state.removedDoublings).toEqual([5])
        expect(done.state.endReason).toBe(EndReason.DrawPilesEmpty)
    })
})

describe('End condition 3: a player has no more boats he may place at the start of his turn', () => {
    it('ends the game when the next player has no boat left', () => {
        const test = scenario({
            counters: [{ intersection: 'AB12', kind: CounterKind.Ship, value: 5 }],
            supply: { p2: 0 }
        })
        const done = captureShip(test, 'AB12')
        expect(done.state.machineState).toBe(MachineState.EndOfGame)
        expect(done.state.endReason).toBe(EndReason.NoBoats)
    })

    it('counts a boat blocked by a loan as one he may not place', () => {
        const test = scenario({
            counters: [{ intersection: 'AB12', kind: CounterKind.Ship, value: 5 }],
            supply: { p2: 1 },
            loans: { p2: 4 }
        })
        const done = captureShip(test, 'AB12')
        expect(done.state.endReason).toBe(EndReason.NoBoats)
    })

    it('does not end the game while a boat can still be placed', () => {
        const test = scenario({
            counters: [{ intersection: 'AB12', kind: CounterKind.Ship, value: 5 }],
            supply: { p2: 2 },
            loans: { p2: 4 }
        })
        const done = captureShip(test, 'AB12')
        expect(done.state.machineState).toBe(MachineState.StartOfTurn)
        expect(activePlayerId(done.state)).toBe('p2')
    })
})

describe('Passing when no action is possible (U17)', () => {
    const stuck = () =>
        scenario({
            hands: { p1: ['A1'], p2: ['row:A'], p3: ['row:A'], p4: ['row:A'] },
            seaPile: [],
            dutchmanPile: ['row:B']
        })

    it('passes the turn of a player who has no legal action, without a penalty', () => {
        const done = draw(playSea(stuck(), 'A1'), Pile.Dutchman)
        expect(done.processed.filter((action) => action.type === ActionType.Pass)).toHaveLength(4)
        expect(done.state.players.map((player) => player.treasure)).toEqual([20, 20, 20, 20])
    })

    it('ends the game when every player in a row has passed', () => {
        const done = draw(playSea(stuck(), 'A1'), Pile.Dutchman)
        expect(done.state.machineState).toBe(MachineState.EndOfGame)
        expect(done.state.endReason).toBe(EndReason.AllPassed)
    })

    it('does not allow a pass while a legal action exists', () => {
        const test = scenario({ hands: { p1: ['A1'] } })
        expect(() =>
            execute(test, createAction(Pass, { gameId: test.state.gameId, playerId: 'p1' }))
        ).toThrow()
    })
})

describe('Winner and tie-break', () => {
    const player = (playerId: string, treasure: number, ships: number[] = [], loans = 0) => ({
        playerId,
        treasure,
        ships,
        loans
    })

    it('goes to the highest total of treasure plus ships minus double the loans', () => {
        expect(
            winnersOf([player('a', 50), player('b', 31, [20], 0), player('c', 80, [], 20)], [])
        ).toEqual(['b'])
    })

    it('is shared when totals are equal (U10)', () => {
        expect(winnersOf([player('a', 40), player('b', 40), player('c', 10)], [])).toEqual([
            'a',
            'b'
        ])
    })

    it('is reported as a win or a draw at the end of the game', () => {
        const test = scenario({ hands: { p1: ['A1'] }, seaPile: [], dutchmanPile: [] })
        const tied = playSea(test, 'A1')
        expect(tied.state.winningPlayerIds.length).toBeGreaterThan(1)
        const lead = withState(test, (state) => {
            state.getPlayerState('p2').treasure = 99
        })
        const won = playSea(lead, 'A1')
        expect(won.state.winningPlayerIds).toEqual(['p2'])
    })
})
