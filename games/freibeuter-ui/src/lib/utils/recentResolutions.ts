import type { GameAction } from '@tabletop/common'
import {
    isCaptureShip,
    isEndGame,
    isPass,
    isPlayDutchmanCard,
    isPlaySeaCard,
    isResolveEntity
} from '@tabletop/freibeuter'
import type { ResolveEntity } from '@tabletop/freibeuter'

export function recentResolutions(actions: readonly GameAction[]): ResolveEntity[] {
    const found: ResolveEntity[] = []
    for (const action of actions.toReversed()) {
        if (isPlaySeaCard(action) || isPlayDutchmanCard(action) || isCaptureShip(action)) break
        if (isPass(action) || isEndGame(action)) continue
        if (isResolveEntity(action) && action.metadata) found.unshift(action)
    }
    return found
}
