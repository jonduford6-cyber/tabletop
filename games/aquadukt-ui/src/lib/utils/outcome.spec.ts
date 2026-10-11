import { describe, expect, it } from 'vitest'
import { describeOutcome } from './outcome.js'

describe('describeOutcome', () => {
    it('is decided on houses when one player has the most', () => {
        const outcome = describeOutcome([
            { playerId: 'a', houses: 12, tiles: 4 },
            { playerId: 'b', houses: 9, tiles: 6 }
        ])
        expect(outcome).toEqual({ winnerIds: ['a'], basis: 'houses' })
    })

    it('is decided on the tile count when houses are tied', () => {
        const outcome = describeOutcome([
            { playerId: 'a', houses: 9, tiles: 3 },
            { playerId: 'b', houses: 9, tiles: 5 },
            { playerId: 'c', houses: 4, tiles: 4 }
        ])
        expect(outcome).toEqual({ winnerIds: ['b'], basis: 'tiles' })
    })

    it('is a shared win when houses and tiles are both tied', () => {
        const outcome = describeOutcome([
            { playerId: 'a', houses: 9, tiles: 4 },
            { playerId: 'b', houses: 9, tiles: 4 }
        ])
        expect(outcome).toEqual({ winnerIds: ['a', 'b'], basis: 'shared' })
    })
})
