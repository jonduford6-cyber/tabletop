import { describe, expect, it } from 'vitest'
import { board } from '../components/board.js'
import { MachineState } from './states.js'
import { DolmengotterColors } from './colors.js'
import { dolmenValuesFor, SETUP_BY_PLAYER_COUNT } from './setup.js'
import { hydrate, newTestGame } from '../util/testHelper.js'

const EXPECTED = {
    2: { stones: 16, dolmens: { 4: 1, 3: 3, 2: 4, 1: 5 } },
    3: { stones: 13, dolmens: { 4: 1, 3: 2, 2: 3, 1: 4 } },
    4: { stones: 12, dolmens: { 4: 1, 3: 1, 2: 3, 1: 4 } },
    5: { stones: 10, dolmens: { 4: 1, 3: 1, 2: 2, 1: 3 } }
} as const

describe.each([2, 3, 4, 5] as const)('Setup for %i players', (numPlayers) => {
    const state = newTestGame(numPlayers).state

    it('gives every player the stones from the setup table', () => {
        expect(SETUP_BY_PLAYER_COUNT[numPlayers].stones).toBe(EXPECTED[numPlayers].stones)
        for (const player of state.players) expect(player.stones).toBe(EXPECTED[numPlayers].stones)
    })

    it('gives every player the dolmens by value from the setup table', () => {
        const expected = EXPECTED[numPlayers].dolmens
        const total = Object.values(expected).reduce((sum, count) => sum + count, 0)
        for (const player of state.players) {
            expect(player.dolmenCount).toBe(total)
            expect(player.dolmens).toHaveLength(total)
            for (const value of [4, 3, 2, 1] as const) {
                expect(player.dolmens.filter((v) => v === value)).toHaveLength(expected[value])
            }
        }
        expect(dolmenValuesFor(numPlayers)).toHaveLength(total)
    })

    it('starts every scoring marker on field 4 of the track', () => {
        expect(board.scoringTrack).toEqual({ first: 1, last: 100, startField: 4 })
        for (const player of state.players) expect(player.points).toBe(4)
    })

    it('keeps all three druids in front of the players and the board empty', () => {
        for (const player of state.players) expect(player.druids).toEqual([])
        expect(state.stones).toEqual([])
        expect(state.circles).toHaveLength(28)
        for (const circle of state.circles) {
            expect(circle.batch).toEqual([])
            expect(circle.hadMajority).toBe(false)
        }
    })

    it('starts in the druid placement with a random first player', () => {
        expect(state.machineState).toBe(MachineState.PlacingDruids)
        expect(state.activePlayerIds).toEqual([state.turnManager.turnOrder[0]])
        expect([...state.turnManager.turnOrder].sort()).toEqual(
            state.players.map((player) => player.playerId).sort()
        )
    })

    it('gives every player a different colour', () => {
        const colours = state.players.map((player) => player.color)
        expect(new Set(colours).size).toBe(numPlayers)
        for (const colour of colours) expect(DolmengotterColors).toContain(colour)
    })

    it('has a hydrated state that passes the canonical check', () => {
        const test = newTestGame(numPlayers)
        expect(() => test.engine.validateCanonicalState(test.state)).not.toThrow()
        expect(hydrate(test).players).toHaveLength(numPlayers)
    })
})

describe('Setup limits', () => {
    it.each([1, 6])('cannot be played with %i players', (numPlayers) => {
        expect(() => newTestGame(numPlayers)).toThrow()
    })

    it('chooses the starting player at random from the seed', () => {
        const first = new Set<string>()
        for (let seed = 0; seed < 24; seed++) {
            const hex = seed.toString(16).padStart(32, '0')
            first.add(newTestGame(4, hex).state.turnManager.turnOrder[0])
        }
        expect(first.size).toBeGreaterThan(1)
    })
})
