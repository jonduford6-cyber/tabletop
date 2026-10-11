import { describe, expect, it } from 'vitest'
import { ActionType } from '@tabletop/aquadukt'
import {
    hasManualAquaduktSelection,
    popAquaduktSelection,
    setAquaduktSelection
} from './stagedSelection.js'

describe('Aquadukt staged selection', () => {
    it('clears the tile value when the action is chosen again', () => {
        let selection = setAquaduktSelection({}, 'action', ActionType.PlaceHouse)
        selection = setAquaduktSelection(selection, 'tileValue', 3)
        expect(selection.tileValue?.value).toBe(3)
        selection = setAquaduktSelection(selection, 'action', ActionType.PlaceSpring)
        expect(selection.action?.value).toBe(ActionType.PlaceSpring)
        expect(selection.tileValue).toBeUndefined()
    })

    it('undoes the highest manual stage first', () => {
        let selection = setAquaduktSelection({}, 'action', ActionType.PlaceHouse)
        selection = setAquaduktSelection(selection, 'tileValue', 2)
        selection = popAquaduktSelection(selection)
        expect(selection.tileValue).toBeUndefined()
        expect(selection.action?.value).toBe(ActionType.PlaceHouse)
        expect(hasManualAquaduktSelection(selection)).toBe(true)
        selection = popAquaduktSelection(selection)
        expect(hasManualAquaduktSelection(selection)).toBe(false)
    })

    it('reports no manual selection when nothing is chosen', () => {
        expect(hasManualAquaduktSelection({})).toBe(false)
    })

    it('clears a stage when its value is undefined', () => {
        const selection = setAquaduktSelection({}, 'action', ActionType.PlaceCanal)
        expect(setAquaduktSelection(selection, 'action', undefined)).toEqual({})
    })
})
