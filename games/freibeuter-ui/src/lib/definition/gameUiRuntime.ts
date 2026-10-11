import type {
    GameUIRuntime,
    PlayerColorPalette
} from '@tabletop/frontend-components/definition/gameUiDefinition'
import { FreibeuterRuntime } from '@tabletop/freibeuter'
import type { FreibeuterProjectedState, HydratedFreibeuterGameState } from '@tabletop/freibeuter'
import { mountDynamicComponent } from '@tabletop/frontend-components/utils/dynamicComponent'
import { FreibeuterColorizer } from './gameColorizer.js'
import Table from '../components/Table.svelte'
import { FreibeuterGameSession } from '../stores/FreibeuterGameSession.svelte.js'
import { PIECE_COLORS } from '../utils/pieceColors.js'
import '../../app.css'

const freibeuterPlayerColorPalette: PlayerColorPalette = Object.fromEntries(
    Object.entries(PIECE_COLORS).map(([color, { fill, text }]) => [
        color,
        { fill, text, contrast: text }
    ])
)

export const FreibeuterUiRuntime: GameUIRuntime<
    FreibeuterProjectedState,
    HydratedFreibeuterGameState
> = {
    ...FreibeuterRuntime,
    gameUI: {
        component: Table,
        load: async () => Table,
        mount: mountDynamicComponent
    },
    sessionClass: FreibeuterGameSession,
    colorizer: new FreibeuterColorizer(),
    playerColorPalette: freibeuterPlayerColorPalette
}
