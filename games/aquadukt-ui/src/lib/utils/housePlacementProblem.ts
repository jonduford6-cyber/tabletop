import { createAction } from '@tabletop/common'
import type { OffsetCoordinates } from '@tabletop/common'
import { HydratedAquaduktGameState, HydratedPlaceHouse, PlaceHouse } from '@tabletop/aquadukt'

export function housePlacementProblem(
    state: HydratedAquaduktGameState,
    playerId: string,
    square: OffsetCoordinates,
    value: number
): string | undefined {
    const trialState = new HydratedAquaduktGameState(state.dehydrate())
    const trialAction = new HydratedPlaceHouse(
        createAction(PlaceHouse, { playerId, row: square.row, col: square.col, value })
    )
    try {
        trialAction.apply(trialState)
    } catch (error) {
        return error instanceof Error ? error.message : String(error)
    }
    return undefined
}
