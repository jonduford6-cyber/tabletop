import type { GameAction } from '@tabletop/common'
import {
    isEndTurn,
    isPass,
    isPlaceCanal,
    isPlaceHouse,
    isPlaceSpring,
    isRollDie
} from '@tabletop/aquadukt'

function plural(count: number, noun: string): string {
    return `${count} ${noun}${count === 1 ? '' : 's'}`
}

export function describeAction(action: GameAction): string {
    switch (true) {
        case isRollDie(action): {
            const metadata = action.metadata
            if (!metadata) return 'rolled the die'
            const skipped = metadata.skippedFullRegions
            const skippedText =
                skipped.length > 0
                    ? ` (rolled full ${skipped.length === 1 ? 'region' : 'regions'} ${skipped.join(', ')} first)`
                    : ''
            return `rolled ${metadata.region}, pointing to region ${metadata.region}${skippedText}`
        }
        case isPlaceHouse(action): {
            const removed = action.metadata?.removedHouses.length ?? 0
            const removedText =
                removed > 0
                    ? `; the region filled up and ${plural(removed, 'unsupplied house tile')} left`
                    : ''
            const region = action.metadata ? ` in region ${action.metadata.region}` : ''
            return `placed a ${action.value}-house tile${region}${removedText}`
        }
        case isPlaceSpring(action):
            return 'discovered a spring'
        case isPlaceCanal(action):
            return action.metadata?.edgeCanalCount === 2 ? 'doubled a canal' : 'built a canal'
        case isEndTurn(action):
            return 'ended their turn'
        case isPass(action):
            return 'had no legal action and passed'
        default:
            return action.type
    }
}
