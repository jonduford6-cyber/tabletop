import type { GameDefinition } from '@tabletop/common'
import type { AquaduktGameState, HydratedAquaduktGameState } from '../model/gameState.js'
import { AquaduktInfo } from './info.js'
import { AquaduktRuntime } from './runtime.js'

export const Definition: GameDefinition<AquaduktGameState, HydratedAquaduktGameState> = {
    info: AquaduktInfo,
    runtime: AquaduktRuntime
}
