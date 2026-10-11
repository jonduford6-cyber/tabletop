import {
    ActionSource,
    type HydratedAction,
    type MachineContext,
    type MachineStateHandler
} from '@tabletop/common'
import { ActionType } from '../definition/actions.js'
import { MachineState } from '../definition/states.js'
import { EndGame } from '../actions/endGame.js'
import { EndReason, type HydratedFreibeuterGameState } from '../model/gameState.js'
import { finishTurn } from '../util/turnFlow.js'

export class DrawingStateHandler implements MachineStateHandler<
    HydratedAction,
    HydratedFreibeuterGameState
> {
    isValidAction(
        action: HydratedAction,
        context: MachineContext<HydratedFreibeuterGameState>
    ): boolean {
        const state = context.gameState
        const [playerId] = state.activePlayerIds
        if (action.source === ActionSource.System) {
            return action.type === ActionType.EndGame && state.drawChoices(playerId).length === 0
        }
        return (
            action.playerId !== undefined &&
            this.validActionsForPlayer(action.playerId, context).includes(action.type)
        )
    }

    validActionsForPlayer(
        playerId: string,
        context: MachineContext<HydratedFreibeuterGameState>
    ): string[] {
        const state = context.gameState
        return state.activePlayerIds.includes(playerId) && state.drawChoices(playerId).length > 0
            ? [ActionType.DrawCard]
            : []
    }

    enter(context: MachineContext<HydratedFreibeuterGameState>) {
        const state = context.gameState
        const [playerId] = state.activePlayerIds
        if (state.drawChoices(playerId).length === 0) {
            context.addSystemAction(EndGame, { reason: EndReason.DrawPilesEmpty })
        }
    }

    onAction(
        action: HydratedAction,
        context: MachineContext<HydratedFreibeuterGameState>
    ): MachineState {
        if (action.type === ActionType.EndGame) return MachineState.EndOfGame
        return finishTurn(context.gameState, false)
    }
}
