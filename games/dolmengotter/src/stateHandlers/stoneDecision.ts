import type { HydratedAction, MachineContext, MachineStateHandler } from '@tabletop/common'
import { ActionType } from '../definition/actions.js'
import { MachineState } from '../definition/states.js'
import { HydratedDeclineStone } from '../actions/declineStone.js'
import type { HydratedDolmengotterGameState } from '../model/gameState.js'
import { afterStoneDecision, finishTurn } from '../util/turnFlow.js'

export class StoneDecisionStateHandler implements MachineStateHandler<
    HydratedAction,
    HydratedDolmengotterGameState
> {
    isValidAction(
        action: HydratedAction,
        context: MachineContext<HydratedDolmengotterGameState>
    ): boolean {
        return (
            action.playerId !== undefined &&
            this.validActionsForPlayer(action.playerId, context).includes(action.type)
        )
    }

    validActionsForPlayer(
        playerId: string,
        context: MachineContext<HydratedDolmengotterGameState>
    ): string[] {
        const state = context.gameState
        return HydratedDeclineStone.canDecline(state, playerId)
            ? [ActionType.PlaceStone, ActionType.DeclineStone]
            : [ActionType.PlaceStone]
    }

    enter(_context: MachineContext<HydratedDolmengotterGameState>) {}

    onAction(
        action: HydratedAction,
        context: MachineContext<HydratedDolmengotterGameState>
    ): MachineState {
        const state = context.gameState
        return action.type === ActionType.DeclineStone
            ? finishTurn(state)
            : afterStoneDecision(state)
    }
}
