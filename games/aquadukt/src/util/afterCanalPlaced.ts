import { MachineState } from '../definition/states.js'
import { MAX_CANALS_PER_TURN } from '../definition/setup.js'
import type { HydratedAquaduktGameState } from '../model/gameState.js'
import { finishTurn } from './turnEnd.js'

export function afterCanalPlaced(state: HydratedAquaduktGameState): MachineState {
    const canPlaceAnother =
        state.canalsPlacedThisTurn < MAX_CANALS_PER_TURN && state.canBuildCanals()
    return canPlaceAnother ? MachineState.CanalPlaced : finishTurn(state, false)
}
