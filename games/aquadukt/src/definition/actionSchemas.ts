import type * as Type from 'typebox'
import { EndTurn } from '../actions/endTurn.js'
import { Pass } from '../actions/pass.js'
import { PlaceCanal } from '../actions/placeCanal.js'
import { PlaceHouse } from '../actions/placeHouse.js'
import { PlaceSpring } from '../actions/placeSpring.js'
import { RollDie } from '../actions/rollDie.js'
import { ActionType } from './actions.js'

export const AquaduktActionSchemas = {
    [ActionType.RollDie]: RollDie,
    [ActionType.PlaceHouse]: PlaceHouse,
    [ActionType.PlaceSpring]: PlaceSpring,
    [ActionType.PlaceCanal]: PlaceCanal,
    [ActionType.EndTurn]: EndTurn,
    [ActionType.Pass]: Pass
} satisfies Record<ActionType, Type.TSchema>
