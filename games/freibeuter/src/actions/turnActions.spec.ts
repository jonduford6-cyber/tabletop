import { describe, expect, it } from 'vitest'
import { CardType } from '../components/cards.js'
import { ActionType } from '../definition/actions.js'
import { MachineState } from '../definition/states.js'
import { CounterKind, Pile } from '../model/gameState.js'
import {
    activePlayerId,
    captureShip,
    draw,
    hydrate,
    playDutchman,
    playSea,
    scenario,
    validActionTypes
} from '../util/testHelper.js'

const SHIP = { intersection: 'AB12', kind: CounterKind.Ship, value: 10 }

describe('Capture a ship', () => {
    const base = () =>
        scenario({
            numPlayers: 3,
            counters: [SHIP, { intersection: 'AB23', kind: CounterKind.Chest }]
        })

    it("puts one of the player's boats on an uncaptured ship", () => {
        const done = captureShip(base(), 'AB12')
        const ship = done.state.counters.find((counter) => counter.intersection === 'AB12')
        expect(ship?.captorId).toBe('p1')
        expect(done.state.players[0].boats).toBe(24)
    })

    it('has no immediate effect: no surround, no payment, no treasure change', () => {
        const done = captureShip(base(), 'AB12')
        expect(done.state.counters).toHaveLength(2)
        expect(done.state.surrounded).toEqual([])
        expect(done.state.players.map((player) => player.treasure)).toEqual([20, 20, 20])
    })

    it('plays no card and draws no card (U1)', () => {
        const before = base()
        const done = captureShip(before, 'AB12')
        expect(done.state.players[0].hand).toEqual(before.state.players[0].hand)
        expect(done.state.seaPile.remaining).toBe(before.state.seaPile.remaining)
        expect(done.state.dutchmanPile.remaining).toBe(before.state.dutchmanPile.remaining)
        expect(done.state.seaDiscard).toEqual([])
        expect(done.processed.map((action) => action.type)).toEqual([ActionType.CaptureShip])
    })

    it('ends the turn and passes it clockwise', () => {
        const done = captureShip(base(), 'AB12')
        expect(done.state.machineState).toBe(MachineState.StartOfTurn)
        expect(activePlayerId(done.state)).toBe('p2')
    })

    it('does not allow a pirate chest or a doubling counter to be captured', () => {
        expect(() => captureShip(base(), 'AB23')).toThrow('Only a ship can be captured')
        const doubling = scenario({
            counters: [SHIP, { intersection: 'AB23', kind: CounterKind.Doubling, value: 5 }]
        })
        expect(() => captureShip(doubling, 'AB23')).toThrow('Only a ship can be captured')
    })

    it('does not allow a captured ship to be captured again', () => {
        const done = captureShip(base(), 'AB12')
        expect(() => captureShip(done, 'AB12')).toThrow()
    })

    it('does not allow capturing where there is no counter', () => {
        expect(() => captureShip(base(), 'CD34')).toThrow('There is no counter')
    })

    it('is not offered when no uncaptured ship is left', () => {
        const none = scenario({ counters: [{ intersection: 'AB12', kind: CounterKind.Chest }] })
        expect(validActionTypes(none)).not.toContain(ActionType.CaptureShip)
        const captured = captureShip(base(), 'AB12')
        const test = scenario({ counters: [{ ...SHIP, captorId: 'p2' }] })
        expect(validActionTypes(test)).not.toContain(ActionType.CaptureShip)
        expect(captured.state.counters).toHaveLength(2)
    })

    it('needs a boat that may be placed', () => {
        const test = scenario({ counters: [SHIP], supply: { p1: 0 } })
        expect(validActionTypes(test)).not.toContain(ActionType.CaptureShip)
        expect(() => captureShip(test, 'AB12')).toThrow()
    })
})

describe('Place a boat on a sea space', () => {
    const base = () => scenario({ hands: { p1: ['B3', 'B3', 'A1', 'row:C'] } })

    it('plays the sea card onto the public discard pile and places a boat on its space', () => {
        const done = playSea(base(), 'B3')
        expect(done.state.placedBoats).toEqual([{ space: 'B3', playerId: 'p1' }])
        expect(done.state.players[0].boats).toBe(24)
        expect(done.state.seaDiscard).toEqual([{ type: CardType.Sea, target: 'B3' }])
        expect(done.state.players[0].seaCount).toBe(2)
        expect(done.state.players[0].hand).toHaveLength(3)
    })

    it('leads to the card draw when nothing is surrounded', () => {
        const done = playSea(base(), 'B3')
        expect(done.state.machineState).toBe(MachineState.Drawing)
        expect(activePlayerId(done.state)).toBe('p1')
    })

    it('needs the card in the hand', () => {
        expect(() => playSea(base(), 'C4')).toThrow('does not hold that sea card')
        expect(() => playSea(base(), 'Z9')).toThrow('not a sea space')
    })

    it('lets a second boat stand on an inside space that already has one', () => {
        const test = scenario({
            hands: { p1: ['B3'], p2: ['B3'] },
            boatsOn: [['B3', 'p2']]
        })
        const done = playSea(test, 'B3')
        expect(done.state.placedBoats.filter((boat) => boat.space === 'B3')).toHaveLength(2)
    })

    it("lets a player take 2 treasure instead of a boat on an occupied space, his own or another's", () => {
        for (const owner of ['p1', 'p2']) {
            const test = scenario({ hands: { p1: ['B3'] }, boatsOn: [['B3', owner]] })
            const done = playSea(test, 'B3', true)
            expect(done.state.players[0].treasure).toBe(22)
            expect(done.state.players[0].boats).toBe(test.state.players[0].boats)
            expect(done.state.placedBoats).toEqual(test.state.placedBoats)
            expect(done.state.seaDiscard).toHaveLength(1)
        }
    })

    it('does not allow taking treasure when the space is empty', () => {
        expect(() => playSea(base(), 'B3', true)).toThrow('occupied space')
    })

    it('still places a boat on an occupied space when the player chooses to', () => {
        const test = scenario({ hands: { p1: ['B3'] }, boatsOn: [['B3', 'p2']] })
        expect(playSea(test, 'B3', false).state.placedBoats).toHaveLength(2)
    })

    it('draws after taking the 2 treasure (U19)', () => {
        const test = scenario({ hands: { p1: ['B3'] }, boatsOn: [['B3', 'p2']] })
        const done = playSea(test, 'B3', true)
        expect(done.state.machineState).toBe(MachineState.Drawing)
    })

    it('never leaves an outside space occupied when its single card is played (U3)', () => {
        const done = playSea(base(), 'A1')
        expect(done.state.placedBoats).toEqual([{ space: 'A1', playerId: 'p1' }])
        expect(() => playSea(scenario({ hands: { p1: ['A1'] } }), 'A1', true)).toThrow()
    })

    it('needs a boat that may be placed', () => {
        const test = scenario({ hands: { p1: ['B3'] }, supply: { p1: 0 } })
        expect(() => playSea(test, 'B3')).toThrow('not valid')
        expect(validActionTypes(test)).not.toContain(ActionType.PlaySeaCard)
    })

    it('is offered only to a player who holds a sea card', () => {
        const test = scenario({ hands: { p1: ['row:C'] } })
        expect(validActionTypes(test)).not.toContain(ActionType.PlaySeaCard)
    })

    it('leaves a placed boat on its space for the rest of the game', () => {
        const done = playSea(base(), 'B3')
        expect(done.state.placedBoats).toHaveLength(1)
        expect(validActionTypes(done, 'p1')).toEqual([ActionType.DrawCard])
    })
})

describe('Place the Flying Dutchman', () => {
    const surroundable = (extra: Parameters<typeof scenario>[0] = {}) =>
        scenario({
            counters: [SHIP],
            boatsOn: [
                ['A1', 'p2'],
                ['A2', 'p3'],
                ['B1', 'p2']
            ],
            hands: { p1: ['B3', 'row:B', 'col:7', 'A5'] },
            ...extra
        })

    it('may be placed anywhere in the row of the card, when that surrounds something', () => {
        const done = playDutchman(surroundable(), 'row:B', 'B2')
        expect(done.state.dutchmanDiscard).toEqual([{ type: CardType.Dutchman, target: 'row:B' }])
        expect(done.state.players[0].dutchmanCount).toBe(1)
    })

    it('may be placed in the column of a column card', () => {
        const test = surroundable({ hands: { p1: ['B3', 'col:2'] } })
        expect(() => playDutchman(test, 'col:2', 'B2')).not.toThrow()
    })

    it('may only be played if it surrounds an entity', () => {
        expect(() => playDutchman(surroundable(), 'row:B', 'B5')).toThrow(
            'only be played if it surrounds something'
        )
        expect(() => playDutchman(surroundable(), 'col:7', 'A7')).toThrow(
            'only be played if it surrounds something'
        )
    })

    it('needs a space in the row or the column of the card', () => {
        expect(() => playDutchman(surroundable(), 'row:B', 'A3')).toThrow(
            'not in the row or column'
        )
    })

    it('needs the card in the hand', () => {
        expect(() =>
            playDutchman(surroundable({ hands: { p1: ['B3', 'row:B'] } }), 'row:A', 'A3')
        ).toThrow('does not hold that Flying Dutchman card')
        expect(() =>
            playDutchman(surroundable({ hands: { p1: ['B3', 'row:B', 'col:7'] } }), 'col:2', 'B2')
        ).toThrow('does not hold that Flying Dutchman card')
    })

    it('counts as a boat when it surrounds an uncaptured ship, which is then removed (U18)', () => {
        const done = playDutchman(surroundable(), 'row:B', 'B2')
        expect(done.state.counters).toEqual([])
        expect(done.state.machineState).toBe(MachineState.Drawing)
    })

    it('surrounds a chest and a doubling counter too', () => {
        for (const kind of [CounterKind.Chest, CounterKind.Doubling]) {
            const test = surroundable({ counters: [{ intersection: 'AB12', kind, value: 5 }] })
            expect(playDutchman(test, 'row:B', 'B2').state.counters).toEqual([])
        }
    })

    it('leaves the board after the turn and needs no boat of the player (U4)', () => {
        const test = surroundable()
        const done = playDutchman(test, 'row:B', 'B2')
        expect(done.state.dutchmanAt).toBeUndefined()
        expect(done.state.placedBoats).toEqual(test.state.placedBoats)
        expect(done.state.players[0].boats).toBe(25)
    })

    it('stays on the board while the surrounded entities are resolved, and is never paid', () => {
        const test = surroundable({
            counters: [{ ...SHIP, captorId: 'p4' }],
            hands: { p1: ['B3', 'row:B'] },
            treasure: { p4: 50 }
        })
        const stopped = playDutchman(test, 'row:B', 'B2')
        expect(stopped.state.dutchmanAt).toBeUndefined()
        const paid = stopped.state.players.map((player) => player.treasure)
        expect(paid).toEqual([20, 20 + 2 * 2, 20 + 2, 50 - 6])
    })

    it('is not offered when no card would surround something', () => {
        const test = surroundable({ hands: { p1: ['B3', 'row:G'] } })
        expect(validActionTypes(test)).not.toContain(ActionType.PlayDutchmanCard)
    })

    it('is offered when a held card would surround something', () => {
        expect(validActionTypes(surroundable())).toContain(ActionType.PlayDutchmanCard)
    })

    it('does not let a boat-less space count: the Flying Dutchman fills only its own space', () => {
        const test = surroundable({
            boatsOn: [
                ['A1', 'p2'],
                ['B1', 'p2']
            ]
        })
        expect(() => playDutchman(test, 'row:B', 'B2')).toThrow('not valid')
    })

    it('is followed by the card draw', () => {
        const done = playDutchman(surroundable(), 'row:B', 'B2')
        expect(done.state.machineState).toBe(MachineState.Drawing)
        expect(draw(done, Pile.Sea).state.players[0].seaCount).toBe(3)
    })

    it('can also be placed on an occupied space of the line, but that never surrounds anything new (U4)', () => {
        const test = surroundable({
            boatsOn: [
                ['A1', 'p2'],
                ['A2', 'p3'],
                ['B1', 'p2'],
                ['B2', 'p2']
            ]
        })
        expect(hydrate(test).findSurrounded()).toEqual(['AB12'])
    })
})
