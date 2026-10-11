import { MachineState } from '../definition/states.js'
import type { HydratedDolmengotterGameState } from '../model/gameState.js'

export function afterStoneDecision(state: HydratedDolmengotterGameState): MachineState {
    state.dropDolmenRightsOfPlayersWithoutDolmens()
    const [next] = state.pendingDolmens
    if (next) {
        state.activePlayerIds = [next.playerId]
        return MachineState.DolmenDecision
    }

    state.activePlayerIds = [state.turnPlayerId()]
    state.circlesToScore = state.circlesToScore.filter(
        (circleId) => state.circles[circleId].batch.length > 0
    )
    return state.circlesToScore.length > 0 ? MachineState.Scoring : finishTurn(state)
}

export function finishTurn(state: HydratedDolmengotterGameState): MachineState {
    const playerId = state.turnPlayerId()
    state.vacatedPlace = undefined
    state.turnManager.endTurn(state.actionCount)

    if (state.allStonesPlaced()) return beginFinalScoring(state)

    if (state.endTriggeredBy !== undefined && state.lastMoves === undefined) {
        const afterThisPlayer = [...state.clockwiseFrom(playerId).slice(1), playerId]
        state.lastMoves = afterThisPlayer.filter((id) => id !== state.endTriggeredBy)
    }

    const lastMovesDone = state.lastMoves !== undefined && state.lastMoves.length === 0
    return lastMovesDone ? beginFinalScoring(state) : MachineState.StartOfTurn
}

export function beginFinalScoring(state: HydratedDolmengotterGameState): MachineState {
    state.ending = true
    state.circlesToScore = state.circles
        .map((circle, circleId) => ({ circle, circleId }))
        .filter(({ circle }) => circle.batch.length > 0)
        .map(({ circleId }) => circleId)
    state.activePlayerIds = []
    return state.circlesToScore.length > 0 ? MachineState.Scoring : MachineState.EndOfGame
}
