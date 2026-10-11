import {
    type HydratedAction,
    type MachineStateHandler,
    type MachineContext
} from '@tabletop/common'
import { ActionType } from '../definition/actions.js'
import { MachineState } from '../definition/states.js'
import type { HydratedAquaduktGameState } from '../model/gameState.js'
import { finishTurn } from '../util/turnEnd.js'

export class HousePlacedStateHandler implements MachineStateHandler<
    HydratedAction,
    HydratedAquaduktGameState
> {
    isValidAction(
        action: HydratedAction,
        _context: MachineContext<HydratedAquaduktGameState>
    ): boolean {
        return action.type === ActionType.RollDie || action.type === ActionType.EndTurn
    }

    validActionsForPlayer(
        _playerId: string,
        _context: MachineContext<HydratedAquaduktGameState>
    ): ActionType[] {
        return [ActionType.RollDie, ActionType.EndTurn]
    }

    enter(_context: MachineContext<HydratedAquaduktGameState>) {}

    onAction(
        action: HydratedAction,
        context: MachineContext<HydratedAquaduktGameState>
    ): MachineState {
        if (action.type === ActionType.RollDie) return MachineState.HouseRolled
        if (action.type === ActionType.EndTurn) return finishTurn(context.gameState, false)
        throw Error(`Invalid action type ${action.type}`)
    }
}
