import type { HydratedAction, MachineContext, MachineStateHandler } from '@tabletop/common'
import { ActionType } from '../definition/actions.js'
import { CHEST_COUNT } from '../definition/setup.js'
import { MachineState } from '../definition/states.js'
import { ResolveEntity } from '../actions/resolveEntity.js'
import { EndReason, TurnAction, type HydratedFreibeuterGameState } from '../model/gameState.js'

export class ResolvingEntitiesStateHandler implements MachineStateHandler<
    HydratedAction,
    HydratedFreibeuterGameState
> {
    isValidAction(
        action: HydratedAction,
        context: MachineContext<HydratedFreibeuterGameState>
    ): boolean {
        return action.type === ActionType.ResolveEntity && context.gameState.surrounded.length > 0
    }

    validActionsForPlayer(
        playerId: string,
        context: MachineContext<HydratedFreibeuterGameState>
    ): string[] {
        const state = context.gameState
        return state.activePlayerIds.includes(playerId) && state.surrounded.length > 0
            ? [ActionType.ResolveEntity]
            : []
    }

    enter(context: MachineContext<HydratedFreibeuterGameState>) {
        const [only, ...others] = context.gameState.surrounded
        if (only !== undefined && others.length === 0) {
            context.addSystemAction(ResolveEntity, { intersection: only })
        }
    }

    onAction(
        _action: HydratedAction,
        context: MachineContext<HydratedFreibeuterGameState>
    ): MachineState {
        const state = context.gameState
        if (state.removedChests >= CHEST_COUNT) {
            state.endReason = EndReason.LastChest
            return MachineState.EndOfGame
        }
        if (state.surrounded.length > 0) return MachineState.ResolvingEntities
        if (state.turnAction === TurnAction.Dutchman) state.dutchmanAt = undefined
        return MachineState.Drawing
    }
}
