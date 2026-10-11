import {
    GameResult,
    type HydratedAction,
    type MachineContext,
    type MachineStateHandler
} from '@tabletop/common'
import type { HydratedFreibeuterGameState } from '../model/gameState.js'
import { winnersOf } from '../util/scoring.js'

export class EndOfGameStateHandler implements MachineStateHandler<
    HydratedAction,
    HydratedFreibeuterGameState
> {
    isValidAction(
        _action: HydratedAction,
        _context: MachineContext<HydratedFreibeuterGameState>
    ): boolean {
        return false
    }

    validActionsForPlayer(
        _playerId: string,
        _context: MachineContext<HydratedFreibeuterGameState>
    ): string[] {
        return []
    }

    enter(context: MachineContext<HydratedFreibeuterGameState>) {
        const state = context.gameState
        const winners = winnersOf(state.players, state.removedDoublings)
        state.result = winners.length === 1 ? GameResult.Win : GameResult.Draw
        state.winningPlayerIds = winners
        state.dutchmanAt = undefined
        state.activePlayerIds = []
    }

    onAction(
        _action: HydratedAction,
        _context: MachineContext<HydratedFreibeuterGameState>
    ): string {
        throw Error('No actions are valid at the end of the game')
    }
}
