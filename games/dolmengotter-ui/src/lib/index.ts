import type { GameUiDefinition } from '@tabletop/frontend-components/definition/gameUiDefinition'
import { DolmengotterInfo } from '@tabletop/dolmengotter'
import type {
    DolmengotterProjectedState,
    HydratedDolmengotterGameState
} from '@tabletop/dolmengotter'
import coverImg from '$lib/images/dolmengotter-cover.svg'

export const UiDefinition: GameUiDefinition<
    DolmengotterProjectedState,
    HydratedDolmengotterGameState
> = {
    info: {
        ...DolmengotterInfo,
        thumbnailUrl: coverImg
    },
    runtime: async () => {
        return (await import('./definition/gameUiRuntime.js')).DolmengotterUiRuntime
    }
}
