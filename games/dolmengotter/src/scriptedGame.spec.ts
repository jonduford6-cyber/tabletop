import { GameResult } from '@tabletop/common'
import { describe, expect, it } from 'vitest'
import { ActionType } from './definition/actions.js'
import { MachineState } from './definition/states.js'
import { dolmenValuesFor } from './definition/setup.js'
import { winnersOf } from './util/winners.js'
import { execute, newTestGame, playBotGame } from './util/testHelper.js'

const SEED = '000000000000000000000000000000d1'

describe.each([2, 3, 4, 5])('Bot-driven game with %i players', (numPlayers) => {
    const { final, actions, processed } = playBotGame(numPlayers, SEED, numPlayers)
    const state = final.state

    it('reaches the end of the game', () => {
        expect(state.machineState).toBe(MachineState.EndOfGame)
        expect(state.activePlayerIds).toEqual([])
        expect(state.ending).toBe(true)
    })

    it('produces a winner or a shared win from the tie-breaks', () => {
        expect(state.winningPlayerIds.length).toBeGreaterThan(0)
        expect(state.winningPlayerIds).toEqual(winnersOf(state))
        expect(state.result).toBe(
            state.winningPlayerIds.length === 1 ? GameResult.Win : GameResult.Draw
        )
    })

    it('uses every kind of action on the way', () => {
        const types = new Set(processed.map((action) => action.type))
        for (const type of [
            ActionType.PlaceDruid,
            ActionType.Walk,
            ActionType.CollectHerbs,
            ActionType.Flight,
            ActionType.PlaceStone,
            ActionType.PlaceDolmen,
            ActionType.ScoreCircle
        ]) {
            expect(types.has(type)).toBe(true)
        }
    })

    it('leaves no dolmen on the board and no pending decision', () => {
        expect(state.circles.every((circle) => circle.batch.length === 0)).toBe(true)
        expect(state.pendingDolmens).toEqual([])
        expect(state.circlesToScore).toEqual([])
    })

    it('accounts for every dolmen: stock, scored and never more than the setup', () => {
        const everyValue = dolmenValuesFor(numPlayers).sort()
        for (const player of state.players) {
            expect(player.dolmenCount).toBe(player.dolmens.length)
            expect(player.dolmensPlaced).toBe(player.scoredValues.length)
            expect([...player.dolmens, ...player.scoredValues].sort()).toEqual(everyValue)
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

const EAGER_BOT_SEEDS: Record<number, number> = { 3: 1, 4: 3, 5: 1 }

describe.each([3, 4, 5])(
    'Eager bot-driven game with %i players ending on the last dolmen',
    (numPlayers) => {
        const { final } = playBotGame(numPlayers, SEED, EAGER_BOT_SEEDS[numPlayers], {
            declineStone: 0,
            declineDolmen: 0
        })
        const state = final.state

        it('ends because a player placed their last dolmen, not because the stones ran out', () => {
            expect(state.machineState).toBe(MachineState.EndOfGame)
            expect(state.endTriggeredBy).toBeDefined()
            const trigger = state.players.find((player) => player.playerId === state.endTriggeredBy)
            expect(trigger?.dolmenCount).toBe(0)
            expect(state.players.some((player) => player.stones > 0)).toBe(true)
        })

        it('gave every other player exactly one last move and the triggering player none', () => {
            expect(state.lastMoves).toEqual([])
            const counts = state.turnManager.turnCounts
            const triggerTurns = counts[state.endTriggeredBy ?? '']
            for (const player of state.players) {
                if (player.playerId === state.endTriggeredBy) continue
                expect(counts[player.playerId] - triggerTurns).toBeGreaterThanOrEqual(0)
                expect(counts[player.playerId] - triggerTurns).toBeLessThanOrEqual(1)
            }
        })

        it('produces a winner or a shared win', () => {
            expect(state.winningPlayerIds.length).toBeGreaterThan(0)
            expect(state.winningPlayerIds).toEqual(winnersOf(state))
        })
    }
)
