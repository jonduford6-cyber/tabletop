import type { HydratedAction, MachineContext, MachineStateHandler } from '@tabletop/common'
import { ActionType } from '../definition/actions.js'
import { MachineState } from '../definition/states.js'
import type { HydratedDolmengotterGameState } from '../model/gameState.js'
import { afterWalkOrFlight, canCollectHerbs, canFly, canWalk } from '../util/turnChoices.js'
import { finishTurn } from '../util/turnFlow.js'

export class StartOfTurnStateHandler implements MachineStateHandler<
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
        const validActions: string[] = []
        if (canWalk(state, playerId)) validActions.push(ActionType.Walk)
        if (canCollectHerbs(state, playerId)) validActions.push(ActionType.CollectHerbs)
        if (canFly(state, playerId)) validActions.push(ActionType.Flight)
        return validActions
    }

    enter(context: MachineContext<HydratedDolmengotterGameState>) {
        const state = context.gameState
        if (state.turnManager.currentTurn()) return

        const nextLastMover = state.lastMoves?.shift()
        const playerId =
            nextLastMover === undefined
                ? state.turnManager.startNextTurn(state.actionCount)
                : state.turnManager.startTurn(nextLastMover, state.actionCount).playerId
        state.activePlayerIds = [playerId]
    }

    onAction(
        action: HydratedAction,
        context: MachineContext<HydratedDolmengotterGameState>
    ): MachineState {
        const state = context.gameState
        switch (action.type) {
            case ActionType.Walk:
            case ActionType.Flight:
                return afterWalkOrFlight(state)
            case ActionType.CollectHerbs:
                return finishTurn(state)
            default:
                throw Error(`Invalid action type ${action.type}`)
        }
    }
}
