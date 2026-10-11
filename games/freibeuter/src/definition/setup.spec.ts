import { describe, expect, it } from 'vitest'
import { allDutchmanCards, allSeaCards, CardType, sameCard } from '../components/cards.js'
import { CounterKind } from '../model/gameState.js'
import { MachineState } from './states.js'
import { FreibeuterColors } from './colors.js'
import { hydrate, newTestGame } from '../util/testHelper.js'

describe.each([2, 3, 4])('Setup for %i players', (numPlayers) => {
    const test = newTestGame(numPlayers)
    const state = test.state

    it('gives every player 25 boats and 20 treasure and no loans', () => {
        for (const player of state.players) {
            expect(player.boats).toBe(25)
            expect(player.treasure).toBe(20)
            expect(player.loans).toBe(0)
            expect(player.ships).toEqual([])
        }
    })

    it('deals 4 sea cards and 1 Flying Dutchman card to every player', () => {
        for (const player of state.players) {
            expect(player.seaCount).toBe(4)
            expect(player.dutchmanCount).toBe(1)
            expect(player.hand).toHaveLength(5)
            expect(player.hand.filter((card) => card.type === CardType.Sea)).toHaveLength(4)
            expect(player.hand.filter((card) => card.type === CardType.Dutchman)).toHaveLength(1)
        }
    })

    it('leaves the rest of the shuffled cards in two draw piles', () => {
        expect(state.seaPile.remaining).toBe(74 - 4 * numPlayers)
        expect(state.dutchmanPile.remaining).toBe(14 - numPlayers)
        expect(state.seaPile.items).toHaveLength(state.seaPile.remaining)
        expect(state.dutchmanPile.items).toHaveLength(state.dutchmanPile.remaining)
        expect(state.seaDiscard).toEqual([])
        expect(state.dutchmanDiscard).toEqual([])
    })

    it('uses every one of the 74 sea cards and 14 Flying Dutchman cards exactly once', () => {
        const everyCard = [
            ...state.players.flatMap((player) => player.hand),
            ...state.seaPile.items,
            ...state.dutchmanPile.items
        ]
        const expected = [...allSeaCards(), ...allDutchmanCards()]
        expect(everyCard).toHaveLength(expected.length)
        for (const card of expected) {
            const index = everyCard.findIndex((candidate) => sameCard(candidate, card))
            expect(index).toBeGreaterThanOrEqual(0)
            everyCard.splice(index, 1)
        }
        expect(everyCard).toEqual([])
    })

    it('puts the 36 counters face up on the 36 intersections', () => {
        expect(state.counters).toHaveLength(36)
        expect(new Set(state.counters.map((counter) => counter.intersection)).size).toBe(36)
        const ships = state.counters.filter((counter) => counter.kind === CounterKind.Ship)
        expect(ships).toHaveLength(28)
        for (const value of [5, 10, 15, 20]) {
            expect(ships.filter((ship) => ship.value === value)).toHaveLength(7)
        }
        expect(state.counters.filter((counter) => counter.kind === CounterKind.Chest)).toHaveLength(
            4
        )
        const doubling = state.counters.filter((counter) => counter.kind === CounterKind.Doubling)
        expect(doubling.map((counter) => counter.value).sort()).toEqual([10, 15, 20, 5])
        expect(state.counters.every((counter) => counter.captorId === undefined)).toBe(true)
    })

    it('starts with no boats on the board, the Flying Dutchman off the board, and nothing captured', () => {
        expect(state.placedBoats).toEqual([])
        expect(state.dutchmanAt).toBeUndefined()
        expect(state.removedChests).toBe(0)
        expect(state.removedDoublings).toEqual([])
        expect(state.surrounded).toEqual([])
    })

    it('starts the first turn with a random player in the start-of-turn state', () => {
        expect(state.machineState).toBe(MachineState.StartOfTurn)
        expect(state.activePlayerIds).toEqual([state.turnManager.turnOrder[0]])
        expect(hydrate(test).turnManager.currentTurn()?.playerId).toBe(state.activePlayerIds[0])
        expect([...state.turnManager.turnOrder].sort()).toEqual(
            state.players.map((player) => player.playerId).sort()
        )
    })

    it('gives every player a different colour', () => {
        const colours = state.players.map((player) => player.color)
        expect(new Set(colours).size).toBe(numPlayers)
        for (const colour of colours) expect(FreibeuterColors).toContain(colour)
    })

    it('passes the canonical check', () => {
        expect(() => test.engine.validateCanonicalState(test.state)).not.toThrow()
    })
})

describe('Setup limits and randomness', () => {
    it.each([1, 5])('cannot be played with %i players', (numPlayers) => {
        expect(() => newTestGame(numPlayers)).toThrow()
    })

    it('chooses the starting player at random from the seed', () => {
        const first = new Set<string>()
        for (let seed = 0; seed < 24; seed++) {
            first.add(
                newTestGame(4, seed.toString(16).padStart(32, '0')).state.turnManager.turnOrder[0]
            )
        }
        expect(first.size).toBeGreaterThan(1)
    })

    it('shuffles the counters and the piles differently for different seeds', () => {
        const one = newTestGame(3, '00000000000000000000000000000001').state
        const two = newTestGame(3, '00000000000000000000000000000002').state
        expect(one.counters).not.toEqual(two.counters)
        expect(one.seaPile.items).not.toEqual(two.seaPile.items)
    })

    it('reproduces the same game from the same seed', () => {
        const one = newTestGame(3, '00000000000000000000000000000003').state
        const two = newTestGame(3, '00000000000000000000000000000003').state
        expect({ ...one, id: '' }).toEqual({ ...two, id: '' })
    })
})
