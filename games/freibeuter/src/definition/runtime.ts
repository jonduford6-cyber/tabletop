import { DefaultStateLogger, type GameRuntime, Visibility } from '@tabletop/common'
import {
    FreibeuterGameState,
    FreibeuterGameStateValidator,
    type FreibeuterProjectedState,
    type HydratedFreibeuterGameState
} from '../model/gameState.js'
import { FreibeuterActionSchemas } from './actionSchemas.js'
import { FreibeuterApiActions } from './apiActions.js'
import { FreibeuterColors } from './colors.js'
import { FreibeuterGameExploration } from './gameExploration.js'
import { FreibeuterGameInitializer } from './gameInitializer.js'
import { FreibeuterHydrator } from './hydrator.js'
import { FreibeuterScoring } from './scoring.js'
import { FreibeuterStateHandlers } from './stateHandlers.js'

export const FreibeuterRuntime = {
    randomnessVersion: 1,
    initializer: new FreibeuterGameInitializer(),
    exploration: new FreibeuterGameExploration(),
    canonicalStateValidator: FreibeuterGameStateValidator,
    hydrator: new FreibeuterHydrator(),
    stateHandlers: FreibeuterStateHandlers,
    apiActions: FreibeuterApiActions,
    playerColors: FreibeuterColors,
    stateLogger: new DefaultStateLogger(),
    scoring: new FreibeuterScoring(),
    visibility: {
        state: Visibility.createProjector(FreibeuterGameState),
        actions: Visibility.createActionProjector(FreibeuterActionSchemas)
    }
} satisfies GameRuntime<FreibeuterProjectedState, HydratedFreibeuterGameState>
