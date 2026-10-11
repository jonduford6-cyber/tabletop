import { ActionSource } from '@tabletop/common'
import { describe, expect, it } from 'vitest'
import { MachineState } from './states.js'
import {
    activePlayerId,
    hydrate,
    newTestGame,
    placeDruid,
    validActionTypes,
    type Spot
} from '../util/testHelper.js'
import { ActionType } from './actions.js'

const SPOTS: Spot[] = [
    [1, 1],
    [1, 2],
    [2, 1],
    [2, 2],
    [3, 3],
    [4, 3],
    [5, 2],
    [5, 1],
    [6, 1],
    [6, 2],
    [7, 3],
    [8, 3],
    [9, 2],
    [9, 1],
    [8, 0]
]

describe('Placing the druids', () => {
    it('lets every player place one druid per round, starting with the first player, clockwise', () => {
        let test = newTestGame(3)
        const order = test.state.turnManager.turnOrder
        const seen: string[] = []
        for (let index = 0; index < 9; index++) {
            seen.push(activePlayerId(test.state))
            test = placeDruid(test, SPOTS[index])
        }
        expect(seen).toEqual([...order, ...order, ...order])
    })

    it('gives each player three druids on the places they chose, upright', () => {
        let test = newTestGame(2)
        for (let index = 0; index < 6; index++) test = placeDruid(test, SPOTS[index])
        for (const player of test.state.players) {
            expect(player.druids).toHaveLength(3)
            expect(player.druids.every((druid) => !druid.belly)).toBe(true)
        }
    })

    it('starts the first turn with the first player once all druids stand on the board', () => {
        let test = newTestGame(4)
        const first = test.state.turnManager.turnOrder[0]
        for (let index = 0; index < 12; index++) test = placeDruid(test, SPOTS[index])
        expect(test.state.machineState).toBe(MachineState.StartOfTurn)
        expect(activePlayerId(test.state)).toBe(first)
        expect(hydrate(test).turnManager.currentTurn()?.playerId).toBe(first)
    })

    it('offers only the placement while druids are being placed', () => {
        const test = newTestGame(2)
        expect(validActionTypes(test)).toEqual([ActionType.PlaceDruid])
    })

    it('rejects a place that already holds a druid', () => {
        const test = placeDruid(newTestGame(2), [1, 1])
        expect(() => placeDruid(test, [1, 1])).toThrow('not free')
    })

    it('rejects a place that is not a stone place', () => {
        expect(() => placeDruid(newTestGame(2), [0, 0])).toThrow('not a stone place')
    })

    it('rejects a placement by a player whose turn it is not', () => {
        const test = newTestGame(2)
        const other = test.state.players.find((p) => p.playerId !== activePlayerId(test.state))
        const action = {
            id: 'x',
            gameId: test.state.gameId,
            source: ActionSource.User,
            type: ActionType.PlaceDruid,
            playerId: other?.playerId,
            row: 1,
            col: 1
        }
        expect(() =>
            test.engine.executeAction({ action, state: test.state, game: test.game })
        ).toThrow()
    })

    it('allows druids on border and corner places', () => {
        let test = newTestGame(2)
        test = placeDruid(test, [1, 1])
        test = placeDruid(test, [0, 3])
        expect(test.state.players.flatMap((player) => player.druids)).toHaveLength(2)
    })
})
