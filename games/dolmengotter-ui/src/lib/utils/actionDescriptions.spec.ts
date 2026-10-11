import { createAction } from '@tabletop/common'
import {
    CollectHerbs,
    DeclineDolmen,
    DeclineStone,
    Flight,
    PlaceDolmen,
    PlaceDruid,
    PlaceStone,
    ScoreCircle,
    Walk
} from '@tabletop/dolmengotter'
import { describe, expect, it } from 'vitest'
import { describeAction } from './actionDescriptions.js'

const base = { gameId: 'g', playerId: 'p1' }

describe('describeAction', () => {
    it('describes druid placement and movement', () => {
        expect(describeAction(createAction(PlaceDruid, { ...base, row: 3, col: 5 }))).toBe(
            'placed a druid on (3,5)'
        )
        expect(
            describeAction(
                createAction(Walk, { ...base, fromRow: 2, fromCol: 2, toRow: 1, toCol: 2 })
            )
        ).toBe('walked a druid from (2,2) to (1,2)')
        expect(
            describeAction(
                createAction(Flight, { ...base, fromRow: 2, fromCol: 2, toRow: 9, toCol: 1 })
            )
        ).toBe('flew a druid from (2,2) to (9,1)')
        expect(describeAction(createAction(CollectHerbs, { ...base, row: 4, col: 3 }))).toBe(
            'collected herbs with the druid on (4,3)'
        )
    })

    it('describes the stone decision', () => {
        expect(describeAction(createAction(PlaceStone, base))).toBe('placed a stone')
        expect(describeAction(createAction(DeclineStone, base))).toMatch(
            /declined .* back one field/
        )
    })

    it('shows a dolmen value only when the action carries it', () => {
        const action = createAction(PlaceDolmen, { ...base, circleId: 18, value: 3 })
        expect(describeAction(action)).toBe('placed a dolmen in octagon #19 (value 3)')
        const redacted = { ...action }
        Reflect.deleteProperty(redacted, 'value')
        expect(describeAction(redacted)).toBe('placed a dolmen in octagon #19')
    })

    it('describes a declined dolmen and a scoring', () => {
        expect(describeAction(createAction(DeclineDolmen, { ...base, circleId: 0 }))).toBe(
            'declined a dolmen in square #1'
        )
        const scoring = createAction(ScoreCircle, {
            gameId: 'g',
            circleId: 18,
            metadata: {
                dolmens: [
                    { playerId: 'p1', value: 4, factor: 5, points: 20 },
                    { playerId: 'p2', value: 2, factor: 4, points: 8 }
                ]
            }
        })
        expect(describeAction(scoring)).toBe('octagon #19 scored 28 points for 2 dolmens')
    })
})
