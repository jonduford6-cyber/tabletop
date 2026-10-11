import { Color } from '@tabletop/common'
import { DefaultColorizer } from '@tabletop/frontend-components'
import { pieceColorsFor } from '../utils/pieceColors.js'

export class AquaduktColorizer extends DefaultColorizer {
    override getUiColor(color?: Color): string {
        return pieceColorsFor(color).fill
    }

    override getBgColor(color?: Color): string {
        return pieceColorsFor(color).bgClass
    }

    override getTextColor(color?: Color, asPlayerColor: boolean = false): string {
        if (asPlayerColor) {
            return pieceColorsFor(color).textClass
        }
        return pieceColorsFor(color).text === '#ffffff' ? 'text-white' : 'text-black'
    }
}
