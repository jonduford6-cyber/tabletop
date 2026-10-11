import { describe, expect, it } from 'vitest'
import { ActionType } from '../definition/actions.js'
import { MachineState } from '../definition/states.js'
import { CounterKind, Pile } from '../model/gameState.js'
import {
    activePlayerId,
    draw,
    hydrate,
    playSea,
    resolve,
    scenario,
    validActionTypes
} from '../util/testHelper.js'

const ship = (value: number, captorId?: string, intersection = 'AB12') => ({
    intersection,
    kind: CounterKind.Ship,
    value,
    ...(captorId ? { captorId } : {})
})

const lastBoat = (extra: Parameters<typeof scenario>[0]) =>
    scenario({ hands: { p1: ['B2'] }, ...extra })

describe('When an entity is surrounded', () => {
    it('is not surrounded with a boat missing from one of its four spaces', () => {
        const test = lastBoat({
            counters: [ship(10)],
            boatsOn: [
                ['A1', 'p2'],
                ['A2', 'p2'],
                ['B1', 'p2']
            ]
        })
        expect(hydrate(test).findSurrounded()).toEqual([])
    })

    it('interrupts the turn as soon as the fourth space is filled, before the draw', () => {
        const test = lastBoat({
            counters: [ship(10), ship(10, undefined, 'CD12')],
            boatsOn: [
                ['A1', 'p2'],
                ['A2', 'p2'],
                ['B1', 'p2']
            ]
        })
        const done = playSea(test, 'B2')
        expect(done.processed.map((action) => action.type)).toEqual([
            ActionType.PlaySeaCard,
            ActionType.ResolveEntity
        ])
        expect(done.state.machineState).toBe(MachineState.Drawing)
        expect(done.state.counters.map((counter) => counter.intersection)).toEqual(['CD12'])
    })

    it('resumes the turn after the resolution: the same player draws', () => {
        const done = playSea(
            lastBoat({
                counters: [ship(10)],
                boatsOn: [
                    ['A1', 'p2'],
                    ['A2', 'p2'],
                    ['B1', 'p2']
                ]
            }),
            'B2'
        )
        expect(activePlayerId(done.state)).toBe('p1')
        expect(validActionTypes(done, 'p1')).toEqual([ActionType.DrawCard])
        expect(draw(done, Pile.Sea).state.machineState).toBe(MachineState.StartOfTurn)
    })
})

describe('A ship is surrounded', () => {
    const around: [string, string][] = [
        ['A1', 'p2'],
        ['A2', 'p2'],
        ['B1', 'p2']
    ]

    it('removes an uncaptured ship and pays nobody', () => {
        const done = playSea(lastBoat({ counters: [ship(20)], boatsOn: around }), 'B2')
        expect(done.state.counters).toEqual([])
        expect(done.state.players.map((player) => player.treasure)).toEqual([20, 20, 20, 20])
        expect(done.state.players.every((player) => player.ships.length === 0)).toBe(true)
    })

    it('gives a captured ship to its captor, face down, with his capturing boat back', () => {
        const test = lastBoat({ counters: [ship(15, 'p3')], boatsOn: around })
        expect(test.state.players[2].boats).toBe(24)
        const done = playSea(test, 'B2')
        expect(done.state.players[2].ships).toEqual([15])
        expect(done.state.players[2].boats).toBe(25)
        expect(done.state.counters).toEqual([])
    })

    it('pays each player the amount below the line for each of his boats around it', () => {
        const test = lastBoat({
            counters: [ship(10, 'p4')],
            boatsOn: [
                ['A1', 'p2'],
                ['A2', 'p3'],
                ['B1', 'p2']
            ],
            treasure: { p4: 50 }
        })
        const done = playSea(test, 'B2')
        expect(done.state.players.map((player) => player.treasure)).toEqual([
            20 + 2,
            20 + 4,
            20 + 2,
            50 - 8
        ])
    })

    it('pays per boat when two boats stand on one space', () => {
        const test = lastBoat({
            counters: [ship(20, 'p3')],
            boatsOn: [
                ['A1', 'p2'],
                ['A1', 'p2'],
                ['A2', 'p4'],
                ['B1', 'p4']
            ],
            treasure: { p3: 50 }
        })
        const done = playSea(test, 'B2')
        expect(done.state.players.map((player) => player.treasure)).toEqual([
            20 + 4,
            20 + 8,
            50 - 20,
            20 + 8
        ])
    })

    it('does not make the captor pay for his own boats (U2)', () => {
        const test = lastBoat({
            counters: [ship(20, 'p1')],
            boatsOn: [
                ['A1', 'p1'],
                ['A2', 'p1'],
                ['B1', 'p2']
            ]
        })
        const done = playSea(test, 'B2')
        expect(done.state.players[0].treasure).toBe(20 - 4)
        expect(done.state.players[1].treasure).toBe(20 + 4)
        expect(done.state.players[0].loans).toBe(0)
    })

    it('lets a single pirate take all the booty for himself (U2)', () => {
        const test = lastBoat({
            counters: [ship(20, 'p1')],
            boatsOn: [
                ['A1', 'p1'],
                ['A2', 'p1'],
                ['B1', 'p1']
            ]
        })
        const done = playSea(test, 'B2')
        expect(done.state.players[0].treasure).toBe(20)
        expect(done.state.players[0].ships).toEqual([20])
    })

    it('does not pay the Flying Dutchman: only boats of players are paid', () => {
        const test = lastBoat({
            counters: [ship(15, 'p4')],
            boatsOn: [
                ['A1', 'p2'],
                ['A2', 'p2'],
                ['B1', 'p3']
            ],
            treasure: { p4: 50 }
        })
        expect(hydrate(test).findSurrounded()).toEqual([])
    })

    it('does not double payments with a removed doubling counter', () => {
        const test = lastBoat({
            counters: [ship(10, 'p3')],
            boatsOn: [
                ['A1', 'p2'],
                ['A2', 'p2'],
                ['B1', 'p2']
            ],
            removedDoublings: [10],
            treasure: { p3: 50 }
        })
        const done = playSea(test, 'B2')
        expect(done.state.players[1].treasure).toBe(20 + 6)
        expect(done.state.players[2].treasure).toBe(50 - 8)
    })
})

describe('A pirate chest is surrounded', () => {
    const chest = (extra: Parameters<typeof scenario>[0] = {}) =>
        lastBoat({
            counters: [{ intersection: 'AB12', kind: CounterKind.Chest }],
            boatsOn: [
                ['A1', 'p2'],
                ['A2', 'p3'],
                ['B1', 'p2']
            ],
            ...extra
        })

    it('removes the chest, and every player with boats around it gets 2 from the bank', () => {
        const done = playSea(chest(), 'B2')
        expect(done.state.counters).toEqual([])
        expect(done.state.removedChests).toBe(1)
        expect(done.state.players.map((player) => player.treasure)).toEqual([
            20 + 2,
            20 + 2,
            20 + 2,
            20
        ])
    })

    it('pays each player 2 once, not once per boat (U14)', () => {
        const done = playSea(
            chest({
                boatsOn: [
                    ['A1', 'p2'],
                    ['A2', 'p2'],
                    ['B1', 'p2']
                ]
            }),
            'B2'
        )
        expect(done.state.players[1].treasure).toBe(22)
        expect(done.state.players[0].treasure).toBe(22)
    })

    it('pays both players when two boats of different players stand on one space (U14)', () => {
        const done = playSea(
            chest({
                boatsOn: [
                    ['A1', 'p2'],
                    ['A1', 'p3'],
                    ['A2', 'p2'],
                    ['B1', 'p2']
                ]
            }),
            'B2'
        )
        expect(done.state.players[2].treasure).toBe(22)
    })

    it('does not give treasure to a player without boats around it', () => {
        const done = playSea(chest(), 'B2')
        expect(done.state.players[3].treasure).toBe(20)
    })
})

describe('A doubling counter is surrounded', () => {
    it('removes it and keeps it face up for the final scoring', () => {
        const test = lastBoat({
            counters: [{ intersection: 'AB12', kind: CounterKind.Doubling, value: 15 }],
            boatsOn: [
                ['A1', 'p2'],
                ['A2', 'p3'],
                ['B1', 'p2']
            ]
        })
        const done = playSea(test, 'B2')
        expect(done.state.counters).toEqual([])
        expect(done.state.removedDoublings).toEqual([15])
        expect(done.state.players.map((player) => player.treasure)).toEqual([20, 20, 20, 20])
    })
})

describe('Several entities surrounded at once', () => {
    const two = (captured = false) =>
        scenario({
            hands: { p1: ['B2'] },
            counters: [
                { intersection: 'AB12', kind: CounterKind.Chest },
                ship(10, captured ? 'p3' : undefined, 'AB23')
            ],
            boatsOn: [
                ['A1', 'p2'],
                ['A2', 'p3'],
                ['B1', 'p2'],
                ['A3', 'p2'],
                ['B3', 'p2']
            ],
            treasure: { p3: 0 }
        })

    it('lets the active player choose the order, one entity at a time', () => {
        const test = playSea(two(), 'B2')
        expect(test.state.machineState).toBe(MachineState.ResolvingEntities)
        expect([...test.state.surrounded].sort()).toEqual(['AB12', 'AB23'])
        expect(activePlayerId(test.state)).toBe('p1')
        expect(validActionTypes(test, 'p1')).toEqual([ActionType.ResolveEntity])
        expect(validActionTypes(test, 'p2')).toEqual([])
    })

    it('resolves the last remaining entity by itself', () => {
        const test = playSea(two(), 'B2')
        const half = resolve(test, 'AB23')
        expect(half.state.surrounded).toEqual([])
        expect(half.state.counters).toEqual([])
        expect(half.state.machineState).toBe(MachineState.Drawing)
        expect(half.processed.map((action) => action.type)).toEqual([
            ActionType.ResolveEntity,
            ActionType.ResolveEntity
        ])
    })

    it('does not allow resolving an entity that is not surrounded', () => {
        const test = playSea(two(), 'B2')
        expect(() => resolve(test, 'CD12')).toThrow('not waiting to be resolved')
    })

    it('lets the order matter: a chest paid first can reduce the loan for a captured ship', () => {
        const chestFirst = resolve(playSea(two(true), 'B2'), 'AB12')
        const shipFirst = resolve(playSea(two(true), 'B2'), 'AB23')
        expect(chestFirst.state.players[2].loans).toBe(4)
        expect(shipFirst.state.players[2].loans).toBe(6)
        expect(chestFirst.state.removedChests).toBe(1)
        expect(shipFirst.state.removedChests).toBe(1)
    })
})
