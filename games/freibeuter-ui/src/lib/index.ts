import type { GameUiDefinition } from '@tabletop/frontend-components/definition/gameUiDefinition'
import { FreibeuterInfo } from '@tabletop/freibeuter'
import type { FreibeuterProjectedState, HydratedFreibeuterGameState } from '@tabletop/freibeuter'
import coverImg from '$lib/images/freibeuter-cover.svg'

export const UiDefinition: GameUiDefinition<FreibeuterProjectedState, HydratedFreibeuterGameState> =
    {
        info: {
            ...FreibeuterInfo,
            thumbnailUrl: coverImg
        },
        runtime: async () => {
            return (await import('./definition/gameUiRuntime.js')).FreibeuterUiRuntime
        }
    }
