import * as Type from 'typebox'
import { Compile } from 'typebox/compile'
import { GameAction, HydratableAction, assert, type MachineContext } from '@tabletop/common'
import { ActionType } from '../definition/actions.js'
import { springPlacementProblem } from '../components/canals.js'
import type { HydratedAquaduktGameState } from '../model/gameState.js'

export type PlaceSpring = Type.Static<typeof PlaceSpring>
export const PlaceSpring = Type.Evaluate(
    Type.Intersect([
        Type.Omit(GameAction, ['playerId']),
        Type.Object({
            type: Type.Literal(ActionType.PlaceSpring),
            playerId: Type.String(),
            row: Type.Number(),
            col: Type.Number()
        })
    ])
)

export const PlaceSpringValidator = Compile(PlaceSpring)

export function isPlaceSpring(action?: GameAction): action is PlaceSpring {
    return action?.type === ActionType.PlaceSpring
}

export class HydratedPlaceSpring
    extends HydratableAction<typeof PlaceSpring>
    implements PlaceSpring
{
    declare type: ActionType.PlaceSpring
    declare playerId: string
    declare row: number
    declare col: number

    constructor(data: PlaceSpring) {
        super(data, PlaceSpringValidator)
    }

    apply(state: HydratedAquaduktGameState, _context?: MachineContext) {
        const problem = springPlacementProblem(state, this)
        assert(problem === undefined, problem ?? '')
        state.springs.push({ row: this.row, col: this.col })
    }
}
