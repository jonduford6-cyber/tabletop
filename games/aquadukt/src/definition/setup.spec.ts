import { createAction } from '@tabletop/common'
import { describe, expect, it } from 'vitest'
import { Definition } from './gameDefinition.js'
import { AquaduktActionSchemas } from './actionSchemas.js'
import { AquaduktApiActions } from './apiActions.js'
import { AquaduktStateHandlers } from './stateHandlers.js'
import { ActionType } from './actions.js'
import { MachineState } from './states.js'
import { SETUP_BY_PLAYER_COUNT } from './setup.js'
import { Board } from '../components/board.js'
import { HydratedAquaduktGameState } from '../model/gameState.js'
import { hydrate, newTestGame, activePlayerId } from '../util/testHelper.js'

const seedFor = (n: number) => n.toString(16).padStart(32, '0')

describe('Game info', () => {
    it('identifies the game and its player counts', () => {
        expect(Definition.info.id).toBe('aquadukt')
        expect(Definition.info.metadata.minPlayers).toBe(2)
        expect(Definition.info.metadata.maxPlayers).toBe(4)
    })
})

describe.each([2, 3, 4])('Setup for %i players', (numPlayers) => {
    const { tilesByValue, mountains } = SETUP_BY_PLAYER_COUNT[numPlayers]

    it('gives each player their share of 1, 2, 3 and 4 house tiles', () => {
        const { state } = newTestGame(numPlayers)
        expect(state.players).toHaveLength(numPlayers)
        for (const player of state.players) {
            expect(player.tiles).toEqual(tilesByValue)
        }
    })

    it('uses the tile counts from the rulebook', () => {
        const expected = { 2: [8, 8, 8, 4], 3: [7, 7, 7, 4], 4: [6, 6, 6, 4] }[numPlayers]
        expect(tilesByValue).toEqual(expected)
    })

    it('places the right number of mountains on distinct playable squares', () => {
        const { state } = newTestGame(numPlayers)
        expect(state.mountains).toHaveLength({ 2: 8, 3: 6, 4: 4 }[numPlayers] ?? -1)
        expect(mountains).toBe(state.mountains.length)
        const keys = new Set(state.mountains.map((square) => `${square.row},${square.col}`))
        expect(keys.size).toBe(state.mountains.length)
        expect(state.mountains.every((square) => Board.isPlayable(square))).toBe(true)
    })

    it('starts with an empty board and all springs and canals available', () => {
        const test = newTestGame(numPlayers)
        const state = hydrate(test)
        expect(state.houses).toEqual([])
        expect(state.springs).toEqual([])
        expect(state.canals).toEqual([])
        expect(state.springsRemaining).toBe(5)
        expect(state.canalsRemaining).toBe(36)
        expect(state.machineState).toBe(MachineState.StartOfTurn)
        expect(state.finalRound).toBe(false)
    })

    it('gives each player a different colour', () => {
        const { state } = newTestGame(numPlayers)
        expect(new Set(state.players.map((player) => player.color)).size).toBe(numPlayers)
    })

    it('has exactly one active player, who is first in the turn order', () => {
        const { state } = newTestGame(numPlayers)
        expect(state.activePlayerIds).toHaveLength(1)
        expect(state.turnManager.turnOrder).toHaveLength(numPlayers)
        expect(activePlayerId(state)).toBe(state.turnManager.turnOrder[0])
    })

    it('hydrates and dehydrates without change', () => {
        const { state } = newTestGame(numPlayers)
        expect(new HydratedAquaduktGameState(state).dehydrate()).toEqual(state)
    })
})

describe('Starting player', () => {
    it('is chosen at random, not by a roll', () => {
        const starters = new Set<string>()
        for (let n = 1; n <= 20; n++) {
            starters.add(activePlayerId(newTestGame(4, seedFor(n)).state))
        }
        expect(starters.size).toBeGreaterThan(1)
    })

    it('is the same for the same seed', () => {
        const a = newTestGame(4, seedFor(7)).state
        const b = newTestGame(4, seedFor(7)).state
        expect(activePlayerId(a)).toBe(activePlayerId(b))
        expect(a.mountains).toEqual(b.mountains)
    })
})

describe('Player count', () => {
    it('rejects games with 1 or 5 players', () => {
        expect(() => newTestGame(5)).toThrow(/cannot be played with 5 players/)
        expect(() => newTestGame(1)).toThrow(/cannot be played with 1 players/)
    })
})

describe('Registration', () => {
    it('maps every machine state to a handler', () => {
        for (const state of Object.values(MachineState)) {
            expect(AquaduktStateHandlers[state]).toBeDefined()
        }
    })

    it('registers every action type in the schemas, API and hydrator', () => {
        for (const type of Object.values(ActionType)) {
            expect(AquaduktActionSchemas[type]).toBeDefined()
            expect(AquaduktApiActions[type]).toBeDefined()
            const action = createAction(AquaduktActionSchemas[type], { playerId: 'p1' })
            expect(Definition.runtime.hydrator.hydrateAction(action).type).toBe(type)
        }
    })
})
