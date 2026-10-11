import { GameResult } from '@tabletop/common'
import { describe, expect, it } from 'vitest'
import { allDutchmanCards, allSeaCards, removeOne } from './components/cards.js'
import { ActionType } from './definition/actions.js'
import { MachineState } from './definition/states.js'
import { CounterKind, EndReason } from './model/gameState.js'
import { finalScore, winnersOf } from './util/scoring.js'
import { execute, newTestGame, playBotGame } from './util/testHelper.js'

const SEED = '000000000000000000000000000000d1'
const BOT_SEEDS: Record<number, number> = { 2: 1, 3: 1, 4: 1 }

describe.each([2, 3, 4])('Bot-driven game with %i players', (numPlayers) => {
    const { final, actions, processed } = playBotGame(numPlayers, SEED, BOT_SEEDS[numPlayers])
    const state = final.state

    it('reaches an end condition', () => {
        expect(state.machineState).toBe(MachineState.EndOfGame)
        expect(state.endReason).toBeDefined()
        expect(state.activePlayerIds).toEqual([])
        expect(state.dutchmanAt).toBeUndefined()
    })

    it('produces a winner or a shared win from the final scoring', () => {
        const winners = winnersOf(state.players, state.removedDoublings)
        expect(state.winningPlayerIds).toEqual(winners)
        expect(state.result).toBe(winners.length === 1 ? GameResult.Win : GameResult.Draw)
        const scores = state.players.map((player) => finalScore(player, state.removedDoublings))
        const best = Math.max(...scores)
        for (const id of winners) {
            const player = state.players.find((candidate) => candidate.playerId === id)
            expect(player && finalScore(player, state.removedDoublings)).toBe(best)
        }
    })

    it('uses the capture, sea card, Flying Dutchman, resolve and draw actions on the way', () => {
        const types = new Set(processed.map((action) => action.type))
        for (const type of [
            ActionType.CaptureShip,
            ActionType.PlaySeaCard,
            ActionType.ResolveEntity,
            ActionType.DrawCard
        ]) {
            expect(types.has(type)).toBe(true)
        }
    })

    it('keeps every card in exactly one place', () => {
        const everyCard = [
            ...state.players.flatMap((player) => player.hand),
            ...state.seaPile.items,
            ...state.dutchmanPile.items,
            ...state.seaDiscard,
            ...state.dutchmanDiscard
        ]
        for (const card of [...allSeaCards(), ...allDutchmanCards()]) {
            expect(removeOne(everyCard, card)).toBe(true)
        }
        expect(everyCard).toEqual([])
        for (const player of state.players) {
            expect(player.hand).toHaveLength(player.seaCount + player.dutchmanCount)
        }
    })

    it('keeps every boat, ship and counter accounted for', () => {
        for (const player of state.players) {
            const onBoard = state.placedBoats.filter((boat) => boat.playerId === player.playerId)
            const onShips = state.counters.filter((counter) => counter.captorId === player.playerId)
            expect(player.boats + onBoard.length + onShips.length).toBe(25)
        }
        const ships =
            state.players.reduce((sum, player) => sum + player.ships.length, 0) +
            state.counters.filter((counter) => counter.kind === CounterKind.Ship).length
        expect(ships).toBeLessThanOrEqual(28)
        expect(
            state.removedChests + state.counters.filter((c) => c.kind === CounterKind.Chest).length
        ).toBe(4)
    })

    it('keeps loans consistent: a loan always blocks a boat and treasure never goes negative', () => {
        for (const player of state.players) {
            expect(player.treasure).toBeGreaterThanOrEqual(0)
            expect(player.loans).toBeGreaterThanOrEqual(0)
        }
    })

    it('keeps a canonical state', () => {
        expect(() => final.engine.validateCanonicalState(state)).not.toThrow()
    })

    it('replays to the same result from the same seed and actions', () => {
        let replay = newTestGame(numPlayers, SEED)
        for (const action of actions) replay = execute(replay, action)
        expect({ ...replay.state, id: state.id }).toEqual(state)
    })
})

describe('Bot-driven games across the end conditions', () => {
    const reasons = new Set<EndReason>()
    for (const [numPlayers, botSeed] of [
        [2, 1],
        [3, 1],
        [3, 3],
        [4, 1],
        [4, 2],
        [4, 3]
    ]) {
        const { final } = playBotGame(numPlayers, SEED, botSeed)
        if (final.state.endReason) reasons.add(final.state.endReason)
    }

    it('reaches each of the three ways to end the game', () => {
        expect(reasons.has(EndReason.NoBoats)).toBe(true)
        expect(reasons.has(EndReason.LastChest)).toBe(true)
        expect(reasons.has(EndReason.DrawPilesEmpty)).toBe(true)
    })
})
