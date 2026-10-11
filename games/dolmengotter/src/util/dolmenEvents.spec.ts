import { describe, expect, it } from 'vitest'
import { MAX_BATCH_HEIGHT, CIRCLE_SIZE, type CircleShape } from '../definition/setup.js'
import { dolmenEventForStone, majorityHolder } from './dolmenEvents.js'

describe('Majority', () => {
    it('needs a colour with more stones than every other colour', () => {
        expect(majorityHolder({ a: 2, b: 1 })).toBe('a')
        expect(majorityHolder({ a: 2, b: 2 })).toBeUndefined()
    })

    it('needs at least two stones of the leading colour', () => {
        expect(majorityHolder({ a: 1, b: 0 })).toBeUndefined()
        expect(majorityHolder({ a: 1, b: 1 })).toBeUndefined()
    })

    it('needs a second colour: one colour alone has no majority', () => {
        expect(majorityHolder({ a: 3, b: 0 })).toBeUndefined()
    })

    it('is a relative majority, not an absolute one', () => {
        expect(majorityHolder({ a: 2, b: 1, c: 1 })).toBe('a')
    })
})

describe('Dolmen events from one stone', () => {
    it('gives the initial majority to the colour that now leads with two stones', () => {
        expect(
            dolmenEventForStone({ before: { a: 1, b: 1 }, placedBy: 'a', hadMajority: false })
        ).toEqual({ playerId: 'a', kind: 'majority' })
    })

    it('gives nothing while no colour leads', () => {
        expect(
            dolmenEventForStone({ before: { a: 1, b: 0 }, placedBy: 'b', hadMajority: false })
        ).toBeUndefined()
    })

    it('gives a passive majority to the other colour when a different colour joins a lone one', () => {
        expect(
            dolmenEventForStone({ before: { a: 2, b: 0 }, placedBy: 'b', hadMajority: false })
        ).toEqual({ playerId: 'a', kind: 'majority' })
    })

    it('gives nothing for more stones of a colour that already holds the majority', () => {
        expect(
            dolmenEventForStone({ before: { a: 2, b: 1 }, placedBy: 'a', hadMajority: true })
        ).toBeUndefined()
    })

    it('gives an equalizer to the colour that catches up with the leader', () => {
        expect(
            dolmenEventForStone({ before: { a: 2, b: 1 }, placedBy: 'b', hadMajority: true })
        ).toEqual({ playerId: 'b', kind: 'equalizer' })
    })

    it('gives nothing for a third colour that stays behind the leader', () => {
        expect(
            dolmenEventForStone({ before: { a: 2, b: 1, c: 0 }, placedBy: 'c', hadMajority: true })
        ).toBeUndefined()
    })

    it('gives an equalizer to a colour that joins a tie once a majority has existed', () => {
        expect(
            dolmenEventForStone({ before: { a: 2, b: 2, c: 1 }, placedBy: 'c', hadMajority: true })
        ).toEqual({ playerId: 'c', kind: 'equalizer' })
    })

    it('gives no equalizer when two colours of two stones are level but no majority existed', () => {
        expect(
            dolmenEventForStone({ before: { a: 1, b: 1, c: 0 }, placedBy: 'c', hadMajority: false })
        ).toBeUndefined()
    })

    it('gives a further majority to a colour that leaves a tie by placing another stone', () => {
        expect(
            dolmenEventForStone({ before: { a: 2, b: 2 }, placedBy: 'a', hadMajority: true })
        ).toEqual({ playerId: 'a', kind: 'majority' })
    })

    it('gives nothing to a colour that falls behind the leader', () => {
        expect(
            dolmenEventForStone({ before: { a: 3, b: 1 }, placedBy: 'b', hadMajority: true })
        ).toBeUndefined()
    })
})

describe('Maximum batch height', () => {
    const COLOURS = ['a', 'b', 'c', 'd', 'e']

    function mostEvents(size: number): number {
        let best = 0
        const walk = (
            counts: Record<string, number>,
            used: number,
            had: boolean,
            events: number,
            left: number
        ) => {
            best = Math.max(best, events)
            if (left === 0) return
            for (let index = 0; index < Math.min(used + 1, COLOURS.length); index++) {
                const colour = COLOURS[index]
                const event = dolmenEventForStone({
                    before: counts,
                    placedBy: colour,
                    hadMajority: had
                })
                const next = { ...counts, [colour]: (counts[colour] ?? 0) + 1 }
                const nowHas = had || majorityHolder(next) !== undefined
                walk(next, Math.max(used, index + 1), nowHas, events + (event ? 1 : 0), left - 1)
            }
        }
        walk({}, 0, false, 0, size)
        return best
    }

    const SHAPES: CircleShape[] = ['tetragonal', 'hexagonal', 'octagonal']

    it.each(SHAPES)('never allows more dolmens in a %s circle than its maximum height', (shape) => {
        expect(mostEvents(CIRCLE_SIZE[shape])).toBe(MAX_BATCH_HEIGHT[shape])
    })
})
