import {
    ActionSource,
    type HydratedAction,
    type MachineContext,
    type MachineStateHandler
} from '@tabletop/common'
import { ActionType } from '../definition/actions.js'
import { MachineState } from '../definition/states.js'
import { Pass } from '../actions/pass.js'
import { EndGame } from '../actions/endGame.js'
import { EndReason, type HydratedFreibeuterGameState } from '../model/gameState.js'
import { canCapture, canPlayDutchman, canPlaySeaCard, hasLegalAction } from '../util/options.js'
import { finishTurn } from '../util/turnFlow.js'

export class StartOfTurnStateHandler implements MachineStateHandler<
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
            if (action.type === ActionType.EndGame) {
                return state.getPlayerState(playerId).placeableBoats === 0
            }
            return action.type === ActionType.Pass && !hasLegalAction(state, playerId)
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
        const validActions: string[] = []
        if (canCapture(state, playerId)) validActions.push(ActionType.CaptureShip)
        if (canPlaySeaCard(state, playerId)) validActions.push(ActionType.PlaySeaCard)
        if (canPlayDutchman(state, playerId)) validActions.push(ActionType.PlayDutchmanCard)
        return validActions
    }

    enter(context: MachineContext<HydratedFreibeuterGameState>) {
        const state = context.gameState
        if (state.turnManager.currentTurn()) return

        const playerId = state.turnManager.startNextTurn(state.actionCount)
        state.activePlayerIds = [playerId]
        if (state.getPlayerState(playerId).placeableBoats === 0) {
            context.addSystemAction(EndGame, { reason: EndReason.NoBoats })
        } else if (!hasLegalAction(state, playerId)) {
            context.addSystemAction(Pass, { playerId })
        }
    }

    onAction(
        action: HydratedAction,
        context: MachineContext<HydratedFreibeuterGameState>
    ): MachineState {
        const state = context.gameState
        switch (action.type) {
            case ActionType.CaptureShip:
                return finishTurn(state, false)
            case ActionType.PlaySeaCard:
            case ActionType.PlayDutchmanCard:
                return state.surrounded.length > 0
                    ? MachineState.ResolvingEntities
                    : MachineState.Drawing
            case ActionType.Pass: {
                const next = finishTurn(state, true)
                if (state.passes < state.numPlayers) return next
                state.endReason = EndReason.AllPassed
                return MachineState.EndOfGame
            }
            case ActionType.EndGame:
                return MachineState.EndOfGame
            default:
                throw Error(`Invalid action type ${action.type}`)
        }
    }
}
