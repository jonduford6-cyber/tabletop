import * as Type from 'typebox'
import { Compile } from 'typebox/compile'
import {
    GameAction,
    HydratableAction,
    Visibility,
    assert,
    type MachineContext
} from '@tabletop/common'
import { ActionType } from '../definition/actions.js'
import type { HydratedDolmengotterGameState } from '../model/gameState.js'

export type PlaceDolmen = Type.Static<typeof PlaceDolmen>
export const PlaceDolmen = Type.Evaluate(
    Type.Intersect([
        Type.Omit(GameAction, ['playerId']),
        Type.Object({
            type: Type.Literal(ActionType.PlaceDolmen),
            playerId: Type.String(),
            circleId: Type.Number(),
            value: Visibility.protect(Type.Number(), { policy: Visibility.Policy.Actor })
        })
    ])
)

export const PlaceDolmenValidator = Compile(PlaceDolmen)

export function isPlaceDolmen(action?: GameAction): action is PlaceDolmen {
    return action?.type === ActionType.PlaceDolmen
}

export class HydratedPlaceDolmen
    extends HydratableAction<typeof PlaceDolmen>
    implements PlaceDolmen
{
    declare type: ActionType.PlaceDolmen
    declare playerId: string
    declare circleId: number
    declare value: number

    constructor(data: PlaceDolmen) {
        super(data, PlaceDolmenValidator)
    }

    apply(state: HydratedDolmengotterGameState, _context?: MachineContext) {
        const right = state.takePendingDolmen(this.playerId, this.circleId)
        const player = state.getPlayerState(this.playerId)
        assert(player.hasDolmenValue(this.value), 'The player has no dolmen with that value')
        player.takeDolmen(this.value)

        const batch = state.circles[this.circleId].batch
        const dolmen = { playerId: this.playerId, value: this.value }
        if (batch.length === 0) batch.push(dolmen)
        else if (right.kind === 'majority') batch.unshift(dolmen)
        else batch.push(dolmen)

        if (player.dolmenCount === 0 && state.endTriggeredBy === undefined) {
            state.endTriggeredBy = this.playerId
        }
    }
}
