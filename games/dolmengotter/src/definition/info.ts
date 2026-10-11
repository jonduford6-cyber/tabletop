import type { GameInfo } from '@tabletop/common'
import { GAME_VERSION } from './version.js'

export const DolmengotterInfo: GameInfo = {
    id: 'dolmengotter',
    metadata: {
        name: 'Die Dolmengötter',
        designer: 'Bernhard Weber',
        description:
            'Walk, fly and plant stones in the stone circles. Hold the majority in a circle to raise a hidden dolmen god, and score the batch when the circle is complete.',
        year: '',
        minPlayers: 2,
        maxPlayers: 5,
        defaultPlayerCount: 4,
        version: GAME_VERSION,
        beta: true
    }
}
