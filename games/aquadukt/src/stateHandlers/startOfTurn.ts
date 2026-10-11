import {
    type HydratedAction,
    type MachineStateHandler,
    type MachineContext
} from '@tabletop/common'
import { ActionType } from '../definition/actions.js'
import { MachineState } from '../definition/states.js'
import type { HydratedAquaduktGameState } from '../model/gameState.js'
import { HydratedRollDie } from '../actions/rollDie.js'
import { Pass } from '../actions/pass.js'
import { finishTurn } from '../util/turnEnd.js'
import { afterCanalPlaced } from '../util/afterCanalPlaced.js'

export class StartOfTurnStateHandler implements MachineStateHandler<
    HydratedAction,
    HydratedAquaduktGameState
> {
    isValidAction(
        action: HydratedAction,
        context: MachineContext<HydratedAquaduktGameState>
    ): boolean {
        return (
            action.playerId !== undefined &&
            this.validActionsForPlayer(action.playerId, context).includes(action.type)
        )
    }

    validActionsForPlayer(
        playerId: string,
        context: MachineContext<HydratedAquaduktGameState>
    ): string[] {
        const state = context.gameState
        const validActions: string[] = []
        if (HydratedRollDie.canRoll(state, playerId)) validActions.push(ActionType.RollDie)
        if (state.canDiscoverSpring()) validActions.push(ActionType.PlaceSpring)
        if (state.canBuildCanals()) validActions.push(ActionType.PlaceCanal)
        return validActions.length > 0 ? validActions : [ActionType.Pass]
    }

    enter(context: MachineContext<HydratedAquaduktGameState>) {
        const state = context.gameState
        if (state.turnManager.currentTurn()) return

        const playerId = state.turnManager.startNextTurn(state.actionCount)
        state.activePlayerIds = [playerId]
        state.resetTurnProgress()

        const validActions = this.validActionsForPlayer(playerId, context)
        if (validActions.length === 1 && validActions[0] === ActionType.Pass) {
            context.addSystemAction(Pass, { playerId })
        }
    }

    onAction(
        action: HydratedAction,
        context: MachineContext<HydratedAquaduktGameState>
    ): MachineState {
        const state = context.gameState
        switch (action.type) {
            case ActionType.RollDie:
                return MachineState.HouseRolled
            case ActionType.PlaceSpring:
                return finishTurn(state, false)
            case ActionType.PlaceCanal:
                return afterCanalPlaced(state)
            case ActionType.Pass:
                return finishTurn(state, true)
            default:
                throw Error(`Invalid action type ${action.type}`)
        }
    }
}
