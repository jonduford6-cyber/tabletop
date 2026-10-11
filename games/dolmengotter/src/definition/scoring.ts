import type { GameScoring } from '@tabletop/common'
import type { DolmengotterProjectedState } from '../model/gameState.js'

export class DolmengotterScoring implements GameScoring<DolmengotterProjectedState> {
    finalScores(state: DolmengotterProjectedState): Record<string, number> {
        return Object.fromEntries(state.players.map((player) => [player.playerId, player.points]))
    }
}
