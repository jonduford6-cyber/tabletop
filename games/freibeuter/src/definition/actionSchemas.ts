import type * as Type from 'typebox'
import { CaptureShip } from '../actions/captureShip.js'
import { DrawCard } from '../actions/drawCard.js'
import { EndGame } from '../actions/endGame.js'
import { Pass } from '../actions/pass.js'
import { PlayDutchmanCard } from '../actions/playDutchmanCard.js'
import { PlaySeaCard } from '../actions/playSeaCard.js'
import { ResolveEntity } from '../actions/resolveEntity.js'
import { ActionType } from './actions.js'

export const FreibeuterActionSchemas = {
    [ActionType.CaptureShip]: CaptureShip,
    [ActionType.PlaySeaCard]: PlaySeaCard,
    [ActionType.PlayDutchmanCard]: PlayDutchmanCard,
    [ActionType.ResolveEntity]: ResolveEntity,
    [ActionType.DrawCard]: DrawCard,
    [ActionType.Pass]: Pass,
    [ActionType.EndGame]: EndGame
} satisfies Record<ActionType, Type.TSchema>
