import * as Type from 'typebox'
import { Compile } from 'typebox/compile'
import { GameAction, HydratableAction, assert, type MachineContext } from '@tabletop/common'
import { ActionType } from '../definition/actions.js'
import { hasLegalAction } from '../util/options.js'
import type { HydratedFreibeuterGameState } from '../model/gameState.js'

export type Pass = Type.Static<typeof Pass>
export const Pass = Type.Evaluate(
    Type.Intersect([
        Type.Omit(GameAction, ['playerId']),
        Type.Object({
            type: Type.Literal(ActionType.Pass),
            playerId: Type.String()
        })
    ])
)

export const PassValidator = Compile(Pass)

export function isPass(action?: GameAction): action is Pass {
    return action?.type === ActionType.Pass
}

export class HydratedPass extends HydratableAction<typeof Pass> implements Pass {
    declare type: ActionType.Pass
    declare playerId: string

    constructor(data: Pass) {
        super(data, PassValidator)
    }

    apply(state: HydratedFreibeuterGameState, _context?: MachineContext) {
        assert(!hasLegalAction(state, this.playerId), 'A player with a legal action may not pass')
    }
}
