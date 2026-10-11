import * as Type from 'typebox'
import { Compile } from 'typebox/compile'
import { GameAction, HydratableAction, type MachineContext } from '@tabletop/common'
import { ActionType } from '../definition/actions.js'
import type { HydratedDolmengotterGameState } from '../model/gameState.js'

export type DeclineDolmen = Type.Static<typeof DeclineDolmen>
export const DeclineDolmen = Type.Evaluate(
    Type.Intersect([
        Type.Omit(GameAction, ['playerId']),
        Type.Object({
            type: Type.Literal(ActionType.DeclineDolmen),
            playerId: Type.String(),
            circleId: Type.Number()
        })
    ])
)

export const DeclineDolmenValidator = Compile(DeclineDolmen)

export function isDeclineDolmen(action?: GameAction): action is DeclineDolmen {
    return action?.type === ActionType.DeclineDolmen
}

export class HydratedDeclineDolmen
    extends HydratableAction<typeof DeclineDolmen>
    implements DeclineDolmen
{
    declare type: ActionType.DeclineDolmen
    declare playerId: string
    declare circleId: number

    constructor(data: DeclineDolmen) {
        super(data, DeclineDolmenValidator)
    }

    apply(state: HydratedDolmengotterGameState, _context?: MachineContext) {
        state.takePendingDolmen(this.playerId, this.circleId)
    }
}
