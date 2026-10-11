import type { GameDefinition } from '@tabletop/common'
import type {
    DolmengotterProjectedState,
    HydratedDolmengotterGameState
} from '../model/gameState.js'
import { DolmengotterInfo } from './info.js'
import { DolmengotterRuntime } from './runtime.js'

export const Definition: GameDefinition<DolmengotterProjectedState, HydratedDolmengotterGameState> =
    {
        info: DolmengotterInfo,
        runtime: DolmengotterRuntime
    }
