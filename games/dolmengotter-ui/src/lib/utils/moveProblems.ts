import { board, flightDestinations, isFreePlace, walkDestinations } from '@tabletop/dolmengotter'
import type { HydratedDolmengotterGameState } from '@tabletop/dolmengotter'
import type { OffsetCoordinates } from '@tabletop/common'

function sameSpot(a: OffsetCoordinates, b: OffsetCoordinates): boolean {
    return a.row === b.row && a.col === b.col
}

function occupant(state: HydratedDolmengotterGameState, place: OffsetCoordinates): string {
    if (state.stoneAt(place)) return 'a stone'
    return 'a druid'
}

export function placementProblem(
    state: HydratedDolmengotterGameState,
    place: OffsetCoordinates
): string | undefined {
    if (isFreePlace(state.occupancy, place)) return undefined
    return `That stone place already holds ${occupant(state, place)}`
}

export function walkProblem(
    state: HydratedDolmengotterGameState,
    from: OffsetCoordinates,
    to: OffsetCoordinates
): string | undefined {
    if (sameSpot(from, to)) return 'The druid is already there'
    if (!isFreePlace(state.occupancy, to)) {
        return `That stone place holds ${occupant(state, to)}`
    }
    const reachable = walkDestinations(state.occupancy, from)
    if (reachable.some((place) => sameSpot(place, to))) return undefined
    return 'A druid walks to a neighbouring stone place, or past a row of druids to the free place next to it'
}

export function flightProblem(
    state: HydratedDolmengotterGameState,
    from: OffsetCoordinates,
    to: OffsetCoordinates
): string | undefined {
    if (sameSpot(from, to)) return 'The druid must land on another place'
    if (!board.isStonePlace(to)) return 'That is not a stone place'
    if (!isFreePlace(state.occupancy, to)) return `That stone place holds ${occupant(state, to)}`
    return flightDestinations(state.occupancy, from).some((place) => sameSpot(place, to))
        ? undefined
        : 'The druid cannot land there'
}
