import type { GameAction } from '@tabletop/common'
import {
    board,
    isCollectHerbs,
    isDeclineDolmen,
    isDeclineStone,
    isFlight,
    isPlaceDolmen,
    isPlaceDruid,
    isPlaceStone,
    isScoreCircle,
    isWalk
} from '@tabletop/dolmengotter'

function spot(row: number, col: number): string {
    return `(${row},${col})`
}

export function circleLabel(circleId: number): string {
    const shape = board.circle(circleId).shape
    const word = shape === 'tetragonal' ? 'square' : shape === 'hexagonal' ? 'hexagon' : 'octagon'
    return `${word} #${circleId + 1}`
}

export function describeAction(action: GameAction): string {
    switch (true) {
        case isPlaceDruid(action):
            return `placed a druid on ${spot(action.row, action.col)}`
        case isWalk(action):
            return `walked a druid from ${spot(action.fromRow, action.fromCol)} to ${spot(action.toRow, action.toCol)}`
        case isCollectHerbs(action):
            return `collected herbs with the druid on ${spot(action.row, action.col)}`
        case isFlight(action):
            return `flew a druid from ${spot(action.fromRow, action.fromCol)} to ${spot(action.toRow, action.toCol)}`
        case isPlaceStone(action): {
            const place = action.metadata
            const where = place ? ` on ${spot(place.row, place.col)}` : ''
            const rights = action.metadata?.dolmenRights.length ?? 0
            const extra =
                rights > 0 ? ` (${rights} dolmen ${rights === 1 ? 'chance' : 'chances'})` : ''
            return `placed a stone${where}${extra}`
        }
        case isDeclineStone(action):
            return 'declined to place a stone and moved their marker back one field'
        case isPlaceDolmen(action): {
            const value = action.value === undefined ? '' : ` (value ${action.value})`
            return `placed a dolmen in ${circleLabel(action.circleId)}${value}`
        }
        case isDeclineDolmen(action):
            return `declined a dolmen in ${circleLabel(action.circleId)}`
        case isScoreCircle(action): {
            const dolmens = action.metadata?.dolmens ?? []
            const total = dolmens.reduce((sum, dolmen) => sum + dolmen.points, 0)
            return dolmens.length === 0
                ? `${circleLabel(action.circleId)} is complete`
                : `${circleLabel(action.circleId)} scored ${total} points for ${dolmens.length} ${dolmens.length === 1 ? 'dolmen' : 'dolmens'}`
        }
        default:
            return action.type
    }
}
