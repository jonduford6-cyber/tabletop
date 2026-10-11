import type { GameRuntime } from '@tabletop/common'
import {
    AquaduktGameStateValidator,
    type AquaduktGameState,
    type HydratedAquaduktGameState
} from '../model/gameState.js'
import { AquaduktApiActions } from './apiActions.js'
import { AquaduktColors } from './colors.js'
import { AquaduktGameInitializer } from './gameInitializer.js'
import { AquaduktHydrator } from './hydrator.js'
import { AquaduktScoring } from './scoring.js'
import { AquaduktStateHandlers } from './stateHandlers.js'

export const AquaduktRuntime = {
    randomnessVersion: 1,
    initializer: new AquaduktGameInitializer(),
    canonicalStateValidator: AquaduktGameStateValidator,
    hydrator: new AquaduktHydrator(),
    stateHandlers: AquaduktStateHandlers,
    apiActions: AquaduktApiActions,
    playerColors: AquaduktColors,
    scoring: new AquaduktScoring()
} satisfies GameRuntime<AquaduktGameState, HydratedAquaduktGameState>
