import type { GameDefinition } from '@tabletop/common'
import type { FreibeuterProjectedState, HydratedFreibeuterGameState } from '../model/gameState.js'
import { FreibeuterInfo } from './info.js'
import { FreibeuterRuntime } from './runtime.js'

export const Definition: GameDefinition<FreibeuterProjectedState, HydratedFreibeuterGameState> = {
    info: FreibeuterInfo,
    runtime: FreibeuterRuntime
}
