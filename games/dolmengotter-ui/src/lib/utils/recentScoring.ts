import type { GameAction } from '@tabletop/common'
import {
    isCollectHerbs,
    isFlight,
    isPlaceDruid,
    isScoreCircle,
    isWalk
} from '@tabletop/dolmengotter'
import type { ScoreCircle } from '@tabletop/dolmengotter'

export function recentScorings(actions: readonly GameAction[]): ScoreCircle[] {
    const found: ScoreCircle[] = []
    for (const action of actions.toReversed()) {
        if (isWalk(action) || isFlight(action) || isCollectHerbs(action) || isPlaceDruid(action)) {
            break
        }
        if (isScoreCircle(action) && (action.metadata?.dolmens.length ?? 0) > 0) {
            found.unshift(action)
        }
    }
    return found
}
