import { MachineState } from '../definition/states.js'
import type { HydratedDolmengotterGameState } from '../model/gameState.js'
import { flightDestinations, walkDestinations } from './moves.js'
import { finishTurn } from './turnFlow.js'

export function canWalk(state: HydratedDolmengotterGameState, playerId: string): boolean {
    return state
        .getPlayerState(playerId)
        .druids.some((druid) => !druid.belly && walkDestinations(state.occupancy, druid).length > 0)
}

export function canCollectHerbs(state: HydratedDolmengotterGameState, playerId: string): boolean {
    return state.getPlayerState(playerId).druids.some((druid) => !druid.belly)
}

export function canFly(state: HydratedDolmengotterGameState, playerId: string): boolean {
    return state
        .getPlayerState(playerId)
        .druids.some(
            (druid) => druid.belly && flightDestinations(state.occupancy, druid).length > 0
        )
}

export function afterWalkOrFlight(state: HydratedDolmengotterGameState): MachineState {
    const [playerId] = state.activePlayerIds
    return state.getPlayerState(playerId).stones > 0
        ? MachineState.StoneDecision
        : finishTurn(state)
}
