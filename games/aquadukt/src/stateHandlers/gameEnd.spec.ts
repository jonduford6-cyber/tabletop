import { GameResult } from '@tabletop/common'
import { describe, expect, it } from 'vitest'
import { ActionType } from '../definition/actions.js'
import { MachineState } from '../definition/states.js'
import { EdgeOrientation } from '../components/geometry.js'
import type { Canal } from '../components/canals.js'
import type { House } from '../model/gameState.js'
import { Definition } from '../definition/gameDefinition.js'
import { finishTurn } from '../util/turnEnd.js'
import {
    activePlayerId,
    endTurn,
    hydrate,
    newTestGame,
    pass,
    placeCanal,
    placeHouse,
    placeSpring,
    rollDie,
    rollingRegions,
    validActionTypes,
    withState,
    withTiles,
    type TestGame
} from '../util/testHelper.js'

const { Horizontal, Vertical } = EdgeOrientation

const SPRING = { row: 4, col: 6 }
const SUPPLYING_DOUBLE: Canal = { orientation: Vertical, row: 3, col: 6, count: 2 }

function fillerCanals(pieces: number): Canal[] {
    const canals: Canal[] = []
    for (let col = 0; col < 12 && pieces > 0; col++) {
        const count = Math.min(2, pieces)
        canals.push({ orientation: Horizontal, row: 8, col, count })
        pieces -= count
    }
    for (let row = 0; row < 8 && pieces > 0; row++) {
        const count = Math.min(2, pieces)
        canals.push({ orientation: Vertical, row, col: 12, count })
        pieces -= count
    }
    return canals
}

function oneCanalFromTheEnd(numPlayers: number, houses: House[] = []): TestGame {
    return withState(newTestGame(numPlayers), {
        springs: [SPRING],
        canals: [SUPPLYING_DOUBLE, ...fillerCanals(33)],
        houses
    })
}

function placeLastCanal(test: TestGame): TestGame {
    return placeCanal(test, Horizontal, 3, 6)
}

function declineTurn(test: TestGame): TestGame {
    return endTurn(rollDie(rollingRegions(test, 7)))
}

function playersInOrder(test: TestGame): string[] {
    return test.state.turnManager.turnOrder
}

describe.each([2, 3, 4])('End of the game with %i players', (numPlayers) => {
    it.each([...Array(numPlayers).keys()])(
        'finishes the round when the canals run out on turn position %i',
        (position) => {
            let test = oneCanalFromTheEnd(numPlayers)
            for (let turn = 0; turn < position; turn++) test = declineTurn(test)
            expect(activePlayerId(test.state)).toBe(playersInOrder(test)[position])

            test = placeLastCanal(test)
            expect(test.state.finalRound).toBe(true)
            expect(hydrate(test).canalsRemaining).toBe(0)

            for (let turn = position + 1; turn < numPlayers; turn++) {
                expect(test.state.machineState).toBe(MachineState.StartOfTurn)
                expect(activePlayerId(test.state)).toBe(playersInOrder(test)[turn])
                test = declineTurn(test)
            }
            expect(test.state.machineState).toBe(MachineState.EndOfGame)
        }
    )
})

describe('Final turns', () => {
    it('allow houses but not canals', () => {
        const test = placeLastCanal(oneCanalFromTheEnd(3))
        const valid = validActionTypes(test)
        expect(valid).toContain(ActionType.RollDie)
        expect(valid).not.toContain(ActionType.PlaceCanal)
    })

    it('still remove unsupplied houses from regions that fill up', () => {
        const regionSix: House[] = [
            { row: 3, col: 1, playerId: 'p1', value: 1 },
            { row: 3, col: 2, playerId: 'p1', value: 1 },
            { row: 4, col: 1, playerId: 'p1', value: 1 }
        ]
        const test = placeLastCanal(oneCanalFromTheEnd(2, regionSix))
        const filled = placeHouse(rollDie(rollingRegions(test, 6)), 4, 2, 1)
        expect(filled.state.houses).toEqual([])
    })
})

describe('Scoring at the end of the game', () => {
    function finish(houses: House[]): TestGame {
        return declineTurn(placeLastCanal(oneCanalFromTheEnd(2, houses)))
    }

    const house = (row: number, col: number, playerId: string, value: number): House => ({
        row,
        col,
        playerId,
        value
    })

    it('removes houses that are not supplied with water', () => {
        const final = finish([house(4, 5, 'p1', 4), house(2, 2, 'p1', 4), house(3, 3, 'p2', 1)])
        expect(final.state.houses).toEqual([house(4, 5, 'p1', 4)])
    })

    it('declares the player with the most supplied houses the winner', () => {
        const final = finish([
            house(4, 5, 'p1', 4),
            house(4, 6, 'p1', 2),
            house(4, 7, 'p2', 3),
            house(3, 3, 'p2', 4)
        ])
        expect(final.state.result).toBe(GameResult.Win)
        expect(final.state.winningPlayerIds).toEqual(['p1'])
        expect(final.state.activePlayerIds).toEqual([])
    })

    it('counts only supplied houses when deciding the winner', () => {
        const final = finish([
            house(4, 5, 'p1', 1),
            house(1, 2, 'p1', 4),
            house(2, 2, 'p1', 4),
            house(4, 7, 'p2', 2)
        ])
        expect(final.state.winningPlayerIds).toEqual(['p2'])
    })

    it('breaks a tie on houses with the most supplied tiles', () => {
        const final = finish([house(4, 5, 'p1', 4), house(4, 6, 'p2', 1), house(4, 8, 'p2', 3)])
        expect(final.state.result).toBe(GameResult.Win)
        expect(final.state.winningPlayerIds).toEqual(['p2'])
    })

    it('shares the win when houses and tiles are both tied', () => {
        const final = finish([house(4, 5, 'p1', 4), house(4, 6, 'p2', 4), house(2, 2, 'p1', 4)])
        expect(final.state.result).toBe(GameResult.Draw)
        expect([...final.state.winningPlayerIds].sort()).toEqual(['p1', 'p2'])
    })

    it('reports each players supplied houses as the final scores', () => {
        const final = finish([house(4, 5, 'p1', 4), house(4, 6, 'p2', 1), house(2, 2, 'p2', 4)])
        const scores = Definition.runtime.scoring?.finalScores(final.state)
        expect(scores).toEqual({ p1: 4, p2: 1 })
    })

    it('offers no actions once the game is over', () => {
        const final = finish([house(4, 5, 'p1', 4)])
        expect(final.state.machineState).toBe(MachineState.EndOfGame)
        const actions = final.engine.getValidActionTypesForPlayer(final.game, final.state, 'p1')
        expect(actions).toEqual([])
    })
})

describe('Passing and the stuck-game safeguard', () => {
    function stuckGame(numPlayers: number): TestGame {
        const springs = [
            { row: 0, col: 0 },
            { row: 0, col: 5 },
            { row: 0, col: 10 },
            { row: 5, col: 0 },
            { row: 5, col: 5 }
        ]
        let test = withState(newTestGame(numPlayers), { springs, canals: fillerCanals(36) })
        for (const player of test.state.players) {
            test = withTiles(test, player.playerId, [0, 0, 0, 0])
        }
        return test
    }

    it('offers only a pass when the player has no other action', () => {
        const test = stuckGame(3)
        expect(validActionTypes(test)).toEqual([ActionType.Pass])
    })

    it('does not allow a pass while another action is available', () => {
        expect(() => pass(newTestGame(3))).toThrow(/not valid in state/)
    })

    it('passes automatically for players who cannot act', () => {
        const test = pass(stuckGame(3))
        const passes = test.processed.filter((action) => action.type === ActionType.Pass)
        expect(passes).toHaveLength(3)
        expect(passes.slice(1).every((action) => action.source === 'system')).toBe(true)
    })

    it('ends the game after a full round in which nobody could act', () => {
        const test = pass(stuckGame(3))
        expect(test.state.machineState).toBe(MachineState.EndOfGame)
        expect(test.state.result).toBe(GameResult.Draw)
        expect(test.state.winningPlayerIds).toHaveLength(3)
    })

    it('does not end the game while a pass is followed by a real turn', () => {
        const state = hydrate(stuckGame(3))
        state.consecutivePasses = 1
        expect(finishTurn(state, false)).toBe(MachineState.StartOfTurn)
        expect(state.consecutivePasses).toBe(0)
    })

    it('counts consecutive passes and ends the game at one full round', () => {
        const state = hydrate(newTestGame(3))
        state.turnManager.startNextTurn(state.actionCount)
        expect(finishTurn(state, true)).toBe(MachineState.StartOfTurn)
        expect(state.consecutivePasses).toBe(1)
        state.consecutivePasses = 2
        expect(finishTurn(state, true)).toBe(MachineState.EndOfGame)
    })

    it('resets the pass count when a player acts', () => {
        const base = withState(newTestGame(3), { consecutivePasses: 2 })
        const test = placeSpring(base, 4, 6)
        expect(test.state.consecutivePasses).toBe(0)
        expect(test.state.machineState).toBe(MachineState.StartOfTurn)
    })

    it('passes the last player after the canals run out when they cannot act', () => {
        const springs = [
            SPRING,
            { row: 0, col: 0 },
            { row: 0, col: 5 },
            { row: 0, col: 10 },
            { row: 5, col: 0 }
        ]
        let test = withState(oneCanalFromTheEnd(2), { springs })
        for (const player of test.state.players) {
            test = withTiles(test, player.playerId, [0, 0, 0, 0])
        }
        const final = placeLastCanal(test)
        expect(final.state.machineState).toBe(MachineState.EndOfGame)
        expect(final.processed.filter((action) => action.type === ActionType.Pass)).toHaveLength(1)
    })
})
