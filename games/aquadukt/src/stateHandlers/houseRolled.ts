import {
    type HydratedAction,
    type MachineStateHandler,
    type MachineContext
} from '@tabletop/common'
import { ActionType } from '../definition/actions.js'
import { MachineState } from '../definition/states.js'
import type { HydratedAquaduktGameState } from '../model/gameState.js'
import { HydratedRollDie } from '../actions/rollDie.js'
import { finishTurn } from '../util/turnEnd.js'

export class HouseRolledStateHandler implements MachineStateHandler<
    HydratedAction,
    HydratedAquaduktGameState
> {
    isValidAction(
        action: HydratedAction,
        _context: MachineContext<HydratedAquaduktGameState>
    ): boolean {
        return action.type === ActionType.PlaceHouse || action.type === ActionType.EndTurn
    }

    validActionsForPlayer(
        _playerId: string,
        _context: MachineContext<HydratedAquaduktGameState>
    ): ActionType[] {
        return [ActionType.PlaceHouse, ActionType.EndTurn]
    }

    enter(_context: MachineContext<HydratedAquaduktGameState>) {}

    onAction(
        action: HydratedAction,
        context: MachineContext<HydratedAquaduktGameState>
    ): MachineState {
        const state = context.gameState
        if (action.type === ActionType.EndTurn) return finishTurn(state, false)
        if (action.type !== ActionType.PlaceHouse) throw Error(`Invalid action type ${action.type}`)

        const [playerId] = state.activePlayerIds
        return HydratedRollDie.canRoll(state, playerId)
            ? MachineState.HousePlaced
            : finishTurn(state, false)
    }
}
