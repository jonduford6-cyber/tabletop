import { MachineState } from '../definition/states.js'
import type { HydratedAquaduktGameState } from '../model/gameState.js'

export function finishTurn(state: HydratedAquaduktGameState, passed: boolean): MachineState {
    const [playerId] = state.activePlayerIds
    state.consecutivePasses = passed ? state.consecutivePasses + 1 : 0
    state.resetTurnProgress()
    state.turnManager.endTurn(state.actionCount)

    const everyoneStuck = state.consecutivePasses >= state.numPlayers
    const roundCompleted = state.finalRound && state.isLastInTurnOrder(playerId)
    return everyoneStuck || roundCompleted ? MachineState.EndOfGame : MachineState.StartOfTurn
}
