import type { HydratedAction, MachineStateHandler } from '@tabletop/common'
import { CanalPlacedStateHandler } from '../stateHandlers/canalPlaced.js'
import { EndOfGameStateHandler } from '../stateHandlers/endOfGame.js'
import { HousePlacedStateHandler } from '../stateHandlers/housePlaced.js'
import { HouseRolledStateHandler } from '../stateHandlers/houseRolled.js'
import { StartOfTurnStateHandler } from '../stateHandlers/startOfTurn.js'
import type { HydratedAquaduktGameState } from '../model/gameState.js'
import { MachineState } from './states.js'

export const AquaduktStateHandlers: Record<
    MachineState,
    MachineStateHandler<HydratedAction, HydratedAquaduktGameState>
> = {
    [MachineState.StartOfTurn]: new StartOfTurnStateHandler(),
    [MachineState.HouseRolled]: new HouseRolledStateHandler(),
    [MachineState.HousePlaced]: new HousePlacedStateHandler(),
    [MachineState.CanalPlaced]: new CanalPlacedStateHandler(),
    [MachineState.EndOfGame]: new EndOfGameStateHandler()
}
