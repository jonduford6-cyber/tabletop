import type { GameInfo } from '@tabletop/common'
import { GAME_VERSION } from './version.js'

export const AquaduktInfo: GameInfo = {
    id: 'aquadukt',
    metadata: {
        name: 'Aquädukt',
        designer: 'Bernhard Weber',
        description:
            'Building houses is not hard, but supplying them with water sure is! Place houses where the die sends you, discover springs and lay canals, and make sure your houses are supplied before their region fills up.',
        year: '',
        minPlayers: 2,
        maxPlayers: 4,
        defaultPlayerCount: 4,
        version: GAME_VERSION,
        beta: true
    }
}
