import type { GameScoring } from '@tabletop/common'
import type { AquaduktGameState } from '../model/gameState.js'
import { tallyPlayers } from '../util/tally.js'

export class AquaduktScoring implements GameScoring<AquaduktGameState> {
    finalScores(state: AquaduktGameState): Record<string, number> {
        return Object.fromEntries(
            tallyPlayers(state).map((tally) => [tally.playerId, tally.houses])
        )
    }
}
