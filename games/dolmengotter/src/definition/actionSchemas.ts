import type * as Type from 'typebox'
import { CollectHerbs } from '../actions/collectHerbs.js'
import { DeclineDolmen } from '../actions/declineDolmen.js'
import { DeclineStone } from '../actions/declineStone.js'
import { Flight } from '../actions/flight.js'
import { PlaceDolmen } from '../actions/placeDolmen.js'
import { PlaceDruid } from '../actions/placeDruid.js'
import { PlaceStone } from '../actions/placeStone.js'
import { ScoreCircle } from '../actions/scoreCircle.js'
import { Walk } from '../actions/walk.js'
import { ActionType } from './actions.js'

export const DolmengotterActionSchemas = {
    [ActionType.PlaceDruid]: PlaceDruid,
    [ActionType.Walk]: Walk,
    [ActionType.CollectHerbs]: CollectHerbs,
    [ActionType.Flight]: Flight,
    [ActionType.PlaceStone]: PlaceStone,
    [ActionType.DeclineStone]: DeclineStone,
    [ActionType.PlaceDolmen]: PlaceDolmen,
    [ActionType.DeclineDolmen]: DeclineDolmen,
    [ActionType.ScoreCircle]: ScoreCircle
} satisfies Record<ActionType, Type.TSchema>
