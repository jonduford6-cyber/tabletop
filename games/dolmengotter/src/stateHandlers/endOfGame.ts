import {
    GameResult,
    type HydratedAction,
    type MachineContext,
    type MachineStateHandler
} from '@tabletop/common'
import type { HydratedDolmengotterGameState } from '../model/gameState.js'
import { winnersOf } from '../util/winners.js'

export class EndOfGameStateHandler implements MachineStateHandler<
    HydratedAction,
    HydratedDolmengotterGameState
> {
    isValidAction(
        _action: HydratedAction,
        _context: MachineContext<HydratedDolmengotterGameState>
    ): boolean {
        return false
    }

    validActionsForPlayer(
        _playerId: string,
        _context: MachineContext<HydratedDolmengotterGameState>
    ): string[] {
        return []
    }

    enter(context: MachineContext<HydratedDolmengotterGameState>) {
        const state = context.gameState
        const winners = winnersOf(state)
        state.result = winners.length === 1 ? GameResult.Win : GameResult.Draw
        state.winningPlayerIds = winners
        state.activePlayerIds = []
    }

    onAction(
        _action: HydratedAction,
        _context: MachineContext<HydratedDolmengotterGameState>
    ): string {
        throw Error('No actions are valid at the end of the game')
    }
}
