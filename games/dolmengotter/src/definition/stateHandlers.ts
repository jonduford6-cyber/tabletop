import type { HydratedAction, MachineStateHandler } from '@tabletop/common'
import { DolmenDecisionStateHandler } from '../stateHandlers/dolmenDecision.js'
import { EndOfGameStateHandler } from '../stateHandlers/endOfGame.js'
import { PlacingDruidsStateHandler } from '../stateHandlers/placingDruids.js'
import { ScoringStateHandler } from '../stateHandlers/scoring.js'
import { StartOfTurnStateHandler } from '../stateHandlers/startOfTurn.js'
import { StoneDecisionStateHandler } from '../stateHandlers/stoneDecision.js'
import type { HydratedDolmengotterGameState } from '../model/gameState.js'
import { MachineState } from './states.js'

export const DolmengotterStateHandlers: Record<
    MachineState,
    MachineStateHandler<HydratedAction, HydratedDolmengotterGameState>
> = {
    [MachineState.PlacingDruids]: new PlacingDruidsStateHandler(),
    [MachineState.StartOfTurn]: new StartOfTurnStateHandler(),
    [MachineState.StoneDecision]: new StoneDecisionStateHandler(),
    [MachineState.DolmenDecision]: new DolmenDecisionStateHandler(),
    [MachineState.Scoring]: new ScoringStateHandler(),
    [MachineState.EndOfGame]: new EndOfGameStateHandler()
}
