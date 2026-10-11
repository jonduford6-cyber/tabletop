import type { GameScoring } from '@tabletop/common'
import type { FreibeuterProjectedState } from '../model/gameState.js'
import { finalScore } from '../util/scoring.js'

export class FreibeuterScoring implements GameScoring<FreibeuterProjectedState> {
    finalScores(state: FreibeuterProjectedState): Record<string, number> {
        return Object.fromEntries(
            state.players.map((player) => [
                player.playerId,
                finalScore(player, state.removedDoublings)
            ])
        )
    }
}
