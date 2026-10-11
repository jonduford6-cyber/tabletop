import { describe, expect, it } from 'vitest'
import {
    cardKey,
    hasManualFreibeuterSelection,
    parseCardKey,
    popFreibeuterSelection,
    setFreibeuterSelection
} from './stagedSelection.js'

describe('Freibeuter staged selection', () => {
    it('clears the card and the space when the action is chosen again', () => {
        let selection = setFreibeuterSelection({}, 'card', cardKey('sea', 'C4'))
        selection = setFreibeuterSelection(selection, 'space', 'C4')
        selection = setFreibeuterSelection(selection, 'action', 'capture')
        expect(selection.action?.value).toBe('capture')
        expect(selection.card).toBeUndefined()
        expect(selection.space).toBeUndefined()
    })

    it('undoes the highest manual stage first', () => {
        let selection = setFreibeuterSelection({}, 'card', cardKey('sea', 'C4'))
        selection = setFreibeuterSelection(selection, 'space', 'C4')
        selection = popFreibeuterSelection(selection)
        expect(selection.space).toBeUndefined()
        expect(selection.card?.value).toBe('sea|C4')
        expect(hasManualFreibeuterSelection(selection)).toBe(true)
        selection = popFreibeuterSelection(selection)
        expect(hasManualFreibeuterSelection(selection)).toBe(false)
    })

    it('reports no manual selection when nothing is chosen', () => {
        expect(hasManualFreibeuterSelection({})).toBe(false)
    })

    it('clears a stage when its value is undefined', () => {
        const selection = setFreibeuterSelection({}, 'action', 'capture')
        expect(setFreibeuterSelection(selection, 'action', undefined)).toEqual({})
    })

    it('keeps the card type and target apart in the key', () => {
        expect(parseCardKey(cardKey('dutchman', 'row:C'))).toEqual({
            type: 'dutchman',
            target: 'row:C'
        })
        expect(parseCardKey(cardKey('sea', 'B3'))).toEqual({ type: 'sea', target: 'B3' })
    })
})
