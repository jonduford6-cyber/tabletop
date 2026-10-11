import type { GameUiDefinition } from '@tabletop/frontend-components/definition/gameUiDefinition'
import { AquaduktInfo } from '@tabletop/aquadukt'
import type { AquaduktGameState, HydratedAquaduktGameState } from '@tabletop/aquadukt'
import coverImg from '$lib/images/aquadukt-cover.svg'

export const UiDefinition: GameUiDefinition<AquaduktGameState, HydratedAquaduktGameState> = {
    info: {
        ...AquaduktInfo,
        thumbnailUrl: coverImg
    },
    runtime: async () => {
        return (await import('./definition/gameUiRuntime.js')).AquaduktUiRuntime
    }
}
