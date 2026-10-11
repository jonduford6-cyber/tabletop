import { describe, expect, it } from 'vitest'
import { describeOutcome, rankStandings } from './outcome.js'

const standing = (playerId: string, points: number, dolmensPlaced: number) => ({
    playerId,
    points,
    dolmensPlaced
})

describe('describeOutcome', () => {
    it('picks the player with the most points', () => {
        expect(describeOutcome([standing('a', 30, 1), standing('b', 41, 0)])).toEqual({
            winnerIds: ['b'],
            basis: 'points'
        })
    })

    it('breaks a points tie with the most dolmens built', () => {
        expect(
            describeOutcome([standing('a', 30, 3), standing('b', 30, 5), standing('c', 5, 9)])
        ).toEqual({
            winnerIds: ['b'],
            basis: 'dolmens'
        })
    })

    it('shares the win when points and dolmens built are equal', () => {
        expect(describeOutcome([standing('a', 30, 4), standing('b', 30, 4)])).toEqual({
            winnerIds: ['a', 'b'],
            basis: 'shared'
        })
    })
})

describe('rankStandings', () => {
    it('orders by points, then by dolmens built', () => {
        const ranked = rankStandings([
            standing('a', 10, 1),
            standing('b', 20, 0),
            standing('c', 10, 4)
        ])
        expect(ranked.map((entry) => entry.playerId)).toEqual(['b', 'c', 'a'])
    })
})
