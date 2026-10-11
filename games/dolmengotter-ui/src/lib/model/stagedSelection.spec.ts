import { describe, expect, it } from 'vitest'
import { ActionType } from '@tabletop/dolmengotter'
import {
    hasManualDolmengotterSelection,
    popDolmengotterSelection,
    setDolmengotterSelection
} from './stagedSelection.js'

describe('Dolmengötter staged selection', () => {
    it('clears the druid when the action is chosen again', () => {
        let selection = setDolmengotterSelection({}, 'action', ActionType.Walk)
        selection = setDolmengotterSelection(selection, 'druid', '2,2')
        expect(selection.druid?.value).toBe('2,2')
        selection = setDolmengotterSelection(selection, 'action', ActionType.Flight)
        expect(selection.action?.value).toBe(ActionType.Flight)
        expect(selection.druid).toBeUndefined()
    })

    it('undoes the highest manual stage first', () => {
        let selection = setDolmengotterSelection({}, 'circleId', 4)
        selection = setDolmengotterSelection(selection, 'dolmenValue', 3)
        selection = popDolmengotterSelection(selection)
        expect(selection.dolmenValue).toBeUndefined()
        expect(selection.circleId?.value).toBe(4)
        expect(hasManualDolmengotterSelection(selection)).toBe(true)
        selection = popDolmengotterSelection(selection)
        expect(hasManualDolmengotterSelection(selection)).toBe(false)
    })

    it('reports no manual selection when nothing is chosen', () => {
        expect(hasManualDolmengotterSelection({})).toBe(false)
    })

    it('clears a stage when its value is undefined', () => {
        const selection = setDolmengotterSelection({}, 'action', ActionType.CollectHerbs)
        expect(setDolmengotterSelection(selection, 'action', undefined)).toEqual({})
    })
})
