import type {
    GameUIRuntime,
    PlayerColorPalette
} from '@tabletop/frontend-components/definition/gameUiDefinition'
import { DolmengotterRuntime } from '@tabletop/dolmengotter'
import type {
    DolmengotterProjectedState,
    HydratedDolmengotterGameState
} from '@tabletop/dolmengotter'
import { mountDynamicComponent } from '@tabletop/frontend-components/utils/dynamicComponent'
import { DolmengotterColorizer } from './gameColorizer.js'
import Table from '../components/Table.svelte'
import { DolmengotterGameSession } from '../stores/DolmengotterGameSession.svelte.js'
import { PIECE_COLORS } from '../utils/pieceColors.js'
import '../../app.css'

const dolmengotterPlayerColorPalette: PlayerColorPalette = Object.fromEntries(
    Object.entries(PIECE_COLORS).map(([color, { fill, text }]) => [
        color,
        { fill, text, contrast: text }
    ])
)

export const DolmengotterUiRuntime: GameUIRuntime<
    DolmengotterProjectedState,
    HydratedDolmengotterGameState
> = {
    ...DolmengotterRuntime,
    gameUI: {
        component: Table,
        load: async () => Table,
        mount: mountDynamicComponent
    },
    sessionClass: DolmengotterGameSession,
    colorizer: new DolmengotterColorizer(),
    playerColorPalette: dolmengotterPlayerColorPalette
}
