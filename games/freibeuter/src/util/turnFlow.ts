import { MachineState } from '../definition/states.js'
import type { HydratedFreibeuterGameState } from '../model/gameState.js'

export function finishTurn(state: HydratedFreibeuterGameState, passed: boolean): MachineState {
    state.turnManager.endTurn(state.actionCount)
    state.turnAction = undefined
    state.passes = passed ? state.passes + 1 : 0
    return MachineState.StartOfTurn
}
