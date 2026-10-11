import * as Type from 'typebox'
import { Compile } from 'typebox/compile'
import { GameAction, HydratableAction, type MachineContext } from '@tabletop/common'
import { ActionType } from '../definition/actions.js'
import { EndReason, type HydratedFreibeuterGameState } from '../model/gameState.js'

export type EndGame = Type.Static<typeof EndGame>
export const EndGame = Type.Evaluate(
    Type.Intersect([
        GameAction,
        Type.Object({
            type: Type.Literal(ActionType.EndGame),
            reason: Type.Enum(EndReason)
        })
    ])
)

export const EndGameValidator = Compile(EndGame)

export function isEndGame(action?: GameAction): action is EndGame {
    return action?.type === ActionType.EndGame
}

export class HydratedEndGame extends HydratableAction<typeof EndGame> implements EndGame {
    declare type: ActionType.EndGame
    declare reason: EndReason

    constructor(data: EndGame) {
        super(data, EndGameValidator)
    }

    apply(state: HydratedFreibeuterGameState, _context?: MachineContext) {
        state.endReason = this.reason
    }
}
