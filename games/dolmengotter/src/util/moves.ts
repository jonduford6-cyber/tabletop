import type { OffsetCoordinates } from '@tabletop/common'
import { board, placeKey } from '../components/board.js'

export type Occupancy = {
    hasStone(place: OffsetCoordinates): boolean
    hasDruid(place: OffsetCoordinates): boolean
}

export function isFreePlace(occupancy: Occupancy, place: OffsetCoordinates): boolean {
    return !occupancy.hasStone(place) && !occupancy.hasDruid(place)
}

export function walkDestinations(
    occupancy: Occupancy,
    from: OffsetCoordinates
): OffsetCoordinates[] {
    const visited = new Set([placeKey(from)])
    const queue = [from]
    const destinations = new Map<string, OffsetCoordinates>()
    for (let index = 0; index < queue.length; index++) {
        for (const next of board.neighbours(queue[index])) {
            const key = placeKey(next)
            if (visited.has(key) || occupancy.hasStone(next)) continue
            if (occupancy.hasDruid(next)) {
                visited.add(key)
                queue.push(next)
            } else {
                destinations.set(key, next)
            }
        }
    }
    return [...destinations.values()]
}

export function flightDestinations(
    occupancy: Occupancy,
    from: OffsetCoordinates
): OffsetCoordinates[] {
    return board.places.filter(
        (place) => placeKey(place) !== placeKey(from) && isFreePlace(occupancy, place)
    )
}
