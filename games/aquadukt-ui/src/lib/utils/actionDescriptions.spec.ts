import { createAction } from '@tabletop/common'
import { describe, expect, it } from 'vitest'
import {
    EdgeOrientation,
    EndTurn,
    Pass,
    PlaceCanal,
    PlaceHouse,
    PlaceSpring,
    RollDie
} from '@tabletop/aquadukt'
import { describeAction } from './actionDescriptions.js'

describe('describeAction', () => {
    it('describes a roll with the region it points to', () => {
        const action = createAction(RollDie, {
            playerId: 'p1',
            metadata: { region: 12, skippedFullRegions: [] }
        })
        expect(describeAction(action)).toBe('rolled 12, pointing to region 12')
    })

    it('mentions full regions that were rolled first', () => {
        const action = createAction(RollDie, {
            playerId: 'p1',
            metadata: { region: 9, skippedFullRegions: [3, 4] }
        })
        expect(describeAction(action)).toContain('rolled full regions 3, 4 first')
    })

    it('describes placing a house and the tiles a filled region removes', () => {
        const plain = createAction(PlaceHouse, {
            playerId: 'p1',
            row: 3,
            col: 4,
            value: 3,
            metadata: { region: 7, removedHouses: [] }
        })
        expect(describeAction(plain)).toBe('placed a 3-house tile in region 7')
        const filling = createAction(PlaceHouse, {
            playerId: 'p1',
            row: 3,
            col: 4,
            value: 1,
            metadata: {
                region: 7,
                removedHouses: [{ row: 3, col: 3, playerId: 'p2', value: 2 }]
            }
        })
        expect(describeAction(filling)).toContain('1 unsupplied house tile left')
    })

    it('describes springs, single and double canals, ending a turn and passing', () => {
        expect(describeAction(createAction(PlaceSpring, { playerId: 'p1', row: 1, col: 1 }))).toBe(
            'discovered a spring'
        )
        const canal = { playerId: 'p1', orientation: EdgeOrientation.Vertical, row: 1, col: 1 }
        expect(
            describeAction(createAction(PlaceCanal, { ...canal, metadata: { edgeCanalCount: 1 } }))
        ).toBe('built a canal')
        expect(
            describeAction(createAction(PlaceCanal, { ...canal, metadata: { edgeCanalCount: 2 } }))
        ).toBe('doubled a canal')
        expect(describeAction(createAction(EndTurn, { playerId: 'p1' }))).toBe('ended their turn')
        expect(describeAction(createAction(Pass, { playerId: 'p1' }))).toBe(
            'had no legal action and passed'
        )
    })
})
