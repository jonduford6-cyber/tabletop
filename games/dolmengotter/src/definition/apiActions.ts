import { DolmengotterActionSchemas } from './actionSchemas.js'
import { ActionType } from './actions.js'

export const DolmengotterApiActions = {
    [ActionType.PlaceDruid]: DolmengotterActionSchemas[ActionType.PlaceDruid],
    [ActionType.Walk]: DolmengotterActionSchemas[ActionType.Walk],
    [ActionType.CollectHerbs]: DolmengotterActionSchemas[ActionType.CollectHerbs],
    [ActionType.Flight]: DolmengotterActionSchemas[ActionType.Flight],
    [ActionType.PlaceStone]: DolmengotterActionSchemas[ActionType.PlaceStone],
    [ActionType.DeclineStone]: DolmengotterActionSchemas[ActionType.DeclineStone],
    [ActionType.PlaceDolmen]: DolmengotterActionSchemas[ActionType.PlaceDolmen],
    [ActionType.DeclineDolmen]: DolmengotterActionSchemas[ActionType.DeclineDolmen]
}
