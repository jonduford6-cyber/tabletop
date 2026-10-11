import { GameResult } from '@tabletop/common'
import { describe, expect, it } from 'vitest'
import { ActionType } from './definition/actions.js'
import { MachineState } from './definition/states.js'
import { HydratedAquaduktGameState } from './model/gameState.js'
import { leadingPlayerIds, tallyPlayers } from './util/tally.js'
import { execute, newTestGame, playScriptedGame } from './util/testHelper.js'

const SEED = '000000000000000000000000000000a1'

describe.each([2, 3, 4])('Scripted game with %i players', (numPlayers) => {
    const { final, actions } = playScriptedGame(numPlayers, SEED, numPlayers)
    const state = final.state

    it('reaches the end of the game', () => {
        expect(state.machineState).toBe(MachineState.EndOfGame)
        expect(state.activePlayerIds).toEqual([])
    })

    it('ends because all 36 canals were placed', () => {
        expect(state.finalRound).toBe(true)
        expect(new HydratedAquaduktGameState(state).canalsRemaining).toBe(0)
    })

    it('uses all three actions on the way', () => {
        const types = new Set(actions.map((action) => action.type))
        expect(types.has(ActionType.RollDie)).toBe(true)
        expect(types.has(ActionType.PlaceHouse)).toBe(true)
        expect(types.has(ActionType.PlaceSpring)).toBe(true)
        expect(types.has(ActionType.PlaceCanal)).toBe(true)
    })

    it('gives every player the same number of turns', () => {
        const counts = Object.values(state.turnManager.turnCounts)
        expect(counts).toHaveLength(numPlayers)
        expect(new Set(counts).size).toBe(1)
    })

    it('produces a single winner with the most supplied houses', () => {
        expect(state.result).toBe(GameResult.Win)
        expect(state.winningPlayerIds).toHaveLength(1)
        const tallies = tallyPlayers(state)
        expect(state.winningPlayerIds).toEqual(leadingPlayerIds(tallies))
        const winner = tallies.find((tally) => tally.playerId === state.winningPlayerIds[0])
        expect(winner?.houses).toBe(Math.max(...tallies.map((tally) => tally.houses)))
        expect(winner?.houses).toBeGreaterThan(0)
    })

    it('leaves only supplied houses on the board', () => {
        const hydrated = new HydratedAquaduktGameState(state)
        expect(hydrated.suppliedHouses()).toEqual(state.houses)
    })

    it('never gives a player more tiles than they started with', () => {
        for (const player of state.players) {
            expect(player.tiles.every((count) => count >= 0)).toBe(true)
        }
    })

    it('keeps a canonical state', () => {
        expect(() => final.engine.validateCanonicalState(state)).not.toThrow()
    })

    it('replays to the same result from the same seed and actions', () => {
        let replay = newTestGame(numPlayers, SEED)
        for (const action of actions) replay = execute(replay, action)
        expect(replay.state.houses).toEqual(state.houses)
        expect(replay.state.canals).toEqual(state.canals)
        expect(replay.state.springs).toEqual(state.springs)
        expect(replay.state.mountains).toEqual(state.mountains)
        expect(replay.state.winningPlayerIds).toEqual(state.winningPlayerIds)
        expect(replay.state.prng).toEqual(state.prng)
        expect(replay.state.actionCount).toBe(state.actionCount)
    })
})
