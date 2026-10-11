import * as Type from 'typebox'
import { Compile } from 'typebox/compile'
import { GameAction, HydratableAction, assert, type MachineContext } from '@tabletop/common'
import { ActionType } from '../definition/actions.js'
import { MAX_CANALS_PER_TURN } from '../definition/setup.js'
import { addCanalPiece, canalPlacementProblem } from '../components/canals.js'
import { EdgeOrientation } from '../components/geometry.js'
import type { HydratedAquaduktGameState } from '../model/gameState.js'

export type PlaceCanalMetadata = Type.Static<typeof PlaceCanalMetadata>
export const PlaceCanalMetadata = Type.Object({
    edgeCanalCount: Type.Number()
})

export type PlaceCanal = Type.Static<typeof PlaceCanal>
export const PlaceCanal = Type.Evaluate(
    Type.Intersect([
        Type.Omit(GameAction, ['playerId']),
        Type.Object({
            type: Type.Literal(ActionType.PlaceCanal),
            playerId: Type.String(),
            orientation: Type.Enum(EdgeOrientation),
            row: Type.Number(),
            col: Type.Number(),
            metadata: Type.Optional(PlaceCanalMetadata)
        })
    ])
)

export const PlaceCanalValidator = Compile(PlaceCanal)

export function isPlaceCanal(action?: GameAction): action is PlaceCanal {
    return action?.type === ActionType.PlaceCanal
}

export class HydratedPlaceCanal extends HydratableAction<typeof PlaceCanal> implements PlaceCanal {
    declare type: ActionType.PlaceCanal
    declare playerId: string
    declare orientation: EdgeOrientation
    declare row: number
    declare col: number
    declare metadata?: PlaceCanalMetadata

    constructor(data: PlaceCanal) {
        super(data, PlaceCanalValidator)
    }

    apply(state: HydratedAquaduktGameState, _context?: MachineContext) {
        assert(
            state.canalsPlacedThisTurn < MAX_CANALS_PER_TURN,
            'No more than two canals can be placed in one turn'
        )
        const edge = { orientation: this.orientation, row: this.row, col: this.col }
        const problem = canalPlacementProblem(state, edge)
        assert(problem === undefined, problem ?? '')

        const edgeCanalCount = addCanalPiece(state.canals, edge)
        state.canalsPlacedThisTurn += 1
        if (state.canalsRemaining === 0) state.finalRound = true
        this.metadata = { edgeCanalCount }
    }
}
