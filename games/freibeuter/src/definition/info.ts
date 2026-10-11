import type { GameInfo } from '@tabletop/common'
import { GAME_VERSION } from './version.js'
import { MAX_PLAYERS, MIN_PLAYERS } from './setup.js'

export const FreibeuterInfo: GameInfo = {
    id: 'freibeuter',
    metadata: {
        name: 'Freibeuter',
        designer: 'Reiner Stockhausen',
        description:
            'Capture ships, then surround them with pirate boats. Whoever captured a ship takes its value but pays every pirate who helped to surround it.',
        year: '1998',
        minPlayers: MIN_PLAYERS,
        maxPlayers: MAX_PLAYERS,
        defaultPlayerCount: 4,
        version: GAME_VERSION,
        beta: true
    }
}
