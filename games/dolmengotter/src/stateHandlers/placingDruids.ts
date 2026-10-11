import type { HydratedAction, MachineContext, MachineStateHandler } from '@tabletop/common'
import { ActionType } from '../definition/actions.js'
import { DRUIDS_PER_PLAYER } from '../definition/setup.js'
import { MachineState } from '../definition/states.js'
import type { HydratedDolmengotterGameState } from '../model/gameState.js'

export class PlacingDruidsStateHandler implements MachineStateHandler<
    HydratedAction,
    HydratedDolmengotterGameState
> {
    isValidAction(
        action: HydratedAction,
        _context: MachineContext<HydratedDolmengotterGameState>
    ): boolean {
        return action.type === ActionType.PlaceDruid
    }

    validActionsForPlayer(
        _playerId: string,
        _context: MachineContext<HydratedDolmengotterGameState>
    ): string[] {
        return [ActionType.PlaceDruid]
    }

    enter(context: MachineContext<HydratedDolmengotterGameState>) {
        const state = context.gameState
        const placed = state.players.reduce((total, player) => total + player.druids.length, 0)
        const order = state.turnManager.turnOrder
        state.activePlayerIds = [order[placed % order.length]]
    }

    onAction(
        _action: HydratedAction,
        context: MachineContext<HydratedDolmengotterGameState>
    ): MachineState {
        const state = context.gameState
        const allPlaced = state.players.every(
            (player) => player.druids.length === DRUIDS_PER_PLAYER
        )
        return allPlaced ? MachineState.StartOfTurn : MachineState.PlacingDruids
    }
}
