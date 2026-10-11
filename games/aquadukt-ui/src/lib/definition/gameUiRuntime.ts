import type {
    GameUIRuntime,
    PlayerColorPalette
} from '@tabletop/frontend-components/definition/gameUiDefinition'
import { AquaduktRuntime } from '@tabletop/aquadukt'
import type { AquaduktGameState, HydratedAquaduktGameState } from '@tabletop/aquadukt'
import { mountDynamicComponent } from '@tabletop/frontend-components/utils/dynamicComponent'
import { AquaduktColorizer } from './gameColorizer.js'
import Table from '../components/Table.svelte'
import { AquaduktGameSession } from '../stores/AquaduktGameSession.svelte.js'
import { PIECE_COLORS } from '../utils/pieceColors.js'
import '../../app.css'

const aquaduktPlayerColorPalette: PlayerColorPalette = Object.fromEntries(
    Object.entries(PIECE_COLORS).map(([color, { fill, text }]) => [
        color,
        { fill, text, contrast: text }
    ])
)

export const AquaduktUiRuntime: GameUIRuntime<AquaduktGameState, HydratedAquaduktGameState> = {
    ...AquaduktRuntime,
    gameUI: {
        component: Table,
        load: async () => Table,
        mount: mountDynamicComponent
    },
    sessionClass: AquaduktGameSession,
    colorizer: new AquaduktColorizer(),
    playerColorPalette: aquaduktPlayerColorPalette
}
