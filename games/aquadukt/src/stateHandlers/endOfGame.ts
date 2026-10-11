import {
    GameResult,
    type HydratedAction,
    type MachineContext,
    type MachineStateHandler
} from '@tabletop/common'
import type { HydratedAquaduktGameState } from '../model/gameState.js'
import { leadingPlayerIds, tallyPlayers } from '../util/tally.js'

export class EndOfGameStateHandler implements MachineStateHandler<
    HydratedAction,
    HydratedAquaduktGameState
> {
    isValidAction(
        _action: HydratedAction,
        _context: MachineContext<HydratedAquaduktGameState>
    ): boolean {
        return false
    }

    validActionsForPlayer(
        _playerId: string,
        _context: MachineContext<HydratedAquaduktGameState>
    ): string[] {
        return []
    }

    enter(context: MachineContext<HydratedAquaduktGameState>) {
        const state = context.gameState
        state.removeUnsuppliedHouses()
        const winners = leadingPlayerIds(tallyPlayers(state))
        state.result = winners.length === 1 ? GameResult.Win : GameResult.Draw
        state.winningPlayerIds = winners
        state.activePlayerIds = []
    }

    onAction(_action: HydratedAction, _context: MachineContext<HydratedAquaduktGameState>): string {
        throw Error('No actions are valid at the end of the game')
    }
}
