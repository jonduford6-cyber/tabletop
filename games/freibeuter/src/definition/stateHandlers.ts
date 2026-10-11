import type { HydratedAction, MachineStateHandler } from '@tabletop/common'
import { DrawingStateHandler } from '../stateHandlers/drawing.js'
import { EndOfGameStateHandler } from '../stateHandlers/endOfGame.js'
import { ResolvingEntitiesStateHandler } from '../stateHandlers/resolvingEntities.js'
import { StartOfTurnStateHandler } from '../stateHandlers/startOfTurn.js'
import type { HydratedFreibeuterGameState } from '../model/gameState.js'
import { MachineState } from './states.js'

export const FreibeuterStateHandlers: Record<
    MachineState,
    MachineStateHandler<HydratedAction, HydratedFreibeuterGameState>
> = {
    [MachineState.StartOfTurn]: new StartOfTurnStateHandler(),
    [MachineState.ResolvingEntities]: new ResolvingEntitiesStateHandler(),
    [MachineState.Drawing]: new DrawingStateHandler(),
    [MachineState.EndOfGame]: new EndOfGameStateHandler()
}
