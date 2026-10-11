import { DefaultStateLogger, type GameRuntime, Visibility } from '@tabletop/common'
import {
    DolmengotterGameState,
    DolmengotterGameStateValidator,
    type DolmengotterProjectedState,
    type HydratedDolmengotterGameState
} from '../model/gameState.js'
import { DolmengotterActionSchemas } from './actionSchemas.js'
import { DolmengotterApiActions } from './apiActions.js'
import { DolmengotterColors } from './colors.js'
import { DolmengotterGameExploration } from './gameExploration.js'
import { DolmengotterGameInitializer } from './gameInitializer.js'
import { DolmengotterHydrator } from './hydrator.js'
import { DolmengotterScoring } from './scoring.js'
import { DolmengotterStateHandlers } from './stateHandlers.js'

export const DolmengotterRuntime = {
    randomnessVersion: 1,
    initializer: new DolmengotterGameInitializer(),
    exploration: new DolmengotterGameExploration(),
    canonicalStateValidator: DolmengotterGameStateValidator,
    hydrator: new DolmengotterHydrator(),
    stateHandlers: DolmengotterStateHandlers,
    apiActions: DolmengotterApiActions,
    playerColors: DolmengotterColors,
    stateLogger: new DefaultStateLogger(),
    scoring: new DolmengotterScoring(),
    visibility: {
        state: Visibility.createProjector(DolmengotterGameState),
        actions: Visibility.createActionProjector(DolmengotterActionSchemas)
    }
} satisfies GameRuntime<DolmengotterProjectedState, HydratedDolmengotterGameState>
