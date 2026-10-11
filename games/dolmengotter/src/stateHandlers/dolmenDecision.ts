import type { HydratedAction, MachineContext, MachineStateHandler } from '@tabletop/common'
import { ActionType } from '../definition/actions.js'
import { MachineState } from '../definition/states.js'
import type { HydratedDolmengotterGameState } from '../model/gameState.js'
import { afterStoneDecision } from '../util/turnFlow.js'

export class DolmenDecisionStateHandler implements MachineStateHandler<
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
        const [next] = context.gameState.pendingDolmens
        return next?.playerId === playerId ? [ActionType.PlaceDolmen, ActionType.DeclineDolmen] : []
    }

    enter(_context: MachineContext<HydratedDolmengotterGameState>) {}

    onAction(
        _action: HydratedAction,
        context: MachineContext<HydratedDolmengotterGameState>
    ): MachineState {
        return afterStoneDecision(context.gameState)
    }
}
