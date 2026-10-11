import { describe, expect, it } from 'vitest'
import { EdgeOrientation } from '../components/geometry.js'
import { Definition } from '../definition/gameDefinition.js'
import { leadingPlayerIds, tallyPlayers } from './tally.js'
import { newTestGame, withState } from './testHelper.js'

describe('Leading players', () => {
    it('picks the player with the most houses', () => {
        const tallies = [
            { playerId: 'a', houses: 7, tiles: 5 },
            { playerId: 'b', houses: 9, tiles: 2 }
        ]
        expect(leadingPlayerIds(tallies)).toEqual(['b'])
    })

    it('breaks a tie on houses with the most supplied tiles', () => {
        const tallies = [
            { playerId: 'a', houses: 9, tiles: 3 },
            { playerId: 'b', houses: 9, tiles: 5 },
            { playerId: 'c', houses: 4, tiles: 4 }
        ]
        expect(leadingPlayerIds(tallies)).toEqual(['b'])
    })

    it('shares the win when houses and tiles are both tied', () => {
        const tallies = [
            { playerId: 'a', houses: 9, tiles: 4 },
            { playerId: 'b', houses: 9, tiles: 4 },
            { playerId: 'c', houses: 9, tiles: 3 }
        ]
        expect(leadingPlayerIds(tallies)).toEqual(['a', 'b'])
    })

    it('does not use the tile tie-break against a player with more houses', () => {
        const tallies = [
            { playerId: 'a', houses: 10, tiles: 1 },
            { playerId: 'b', houses: 9, tiles: 9 }
        ]
        expect(leadingPlayerIds(tallies)).toEqual(['a'])
    })
})

describe('Tallying supplied houses', () => {
    it('counts only houses and tiles that are supplied with water', () => {
        const base = newTestGame(2)
        const [a, b] = base.state.players.map((player) => player.playerId)
        const test = withState(base, {
            canals: [{ orientation: EdgeOrientation.Vertical, row: 3, col: 6, count: 2 }],
            houses: [
                { row: 4, col: 5, playerId: a, value: 4 },
                { row: 4, col: 6, playerId: a, value: 2 },
                { row: 2, col: 2, playerId: a, value: 4 },
                { row: 4, col: 8, playerId: b, value: 1 }
            ]
        })
        expect(tallyPlayers(test.state)).toEqual([
            { playerId: a, houses: 6, tiles: 2 },
            { playerId: b, houses: 1, tiles: 1 }
        ])
    })

    it('reports supplied houses as the final scores', () => {
        const base = newTestGame(2)
        const [a, b] = base.state.players.map((player) => player.playerId)
        const test = withState(base, {
            canals: [{ orientation: EdgeOrientation.Vertical, row: 3, col: 6, count: 1 }],
            houses: [
                { row: 4, col: 6, playerId: a, value: 3 },
                { row: 4, col: 7, playerId: b, value: 2 },
                { row: 2, col: 2, playerId: b, value: 4 }
            ]
        })
        const scores = Definition.runtime.scoring?.finalScores(test.state)
        expect(scores).toEqual({ [a]: 3, [b]: 2 })
    })
})
