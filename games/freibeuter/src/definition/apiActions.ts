import { FreibeuterActionSchemas } from './actionSchemas.js'
import { ActionType } from './actions.js'

export const FreibeuterApiActions = {
    [ActionType.CaptureShip]: FreibeuterActionSchemas[ActionType.CaptureShip],
    [ActionType.PlaySeaCard]: FreibeuterActionSchemas[ActionType.PlaySeaCard],
    [ActionType.PlayDutchmanCard]: FreibeuterActionSchemas[ActionType.PlayDutchmanCard],
    [ActionType.ResolveEntity]: FreibeuterActionSchemas[ActionType.ResolveEntity],
    [ActionType.DrawCard]: FreibeuterActionSchemas[ActionType.DrawCard]
}
