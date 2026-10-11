import * as Type from 'typebox'
import { Compile } from 'typebox/compile'
import { GameAction, HydratableAction, assert, type MachineContext } from '@tabletop/common'
import { ActionType } from '../definition/actions.js'
import { walkDestinations } from '../util/moves.js'
import type { HydratedDolmengotterGameState } from '../model/gameState.js'

export type Walk = Type.Static<typeof Walk>
export const Walk = Type.Evaluate(
    Type.Intersect([
        Type.Omit(GameAction, ['playerId']),
        Type.Object({
            type: Type.Literal(ActionType.Walk),
            playerId: Type.String(),
            fromRow: Type.Number(),
            fromCol: Type.Number(),
            toRow: Type.Number(),
            toCol: Type.Number()
        })
    ])
)

export const WalkValidator = Compile(Walk)

export function isWalk(action?: GameAction): action is Walk {
    return action?.type === ActionType.Walk
}

export class HydratedWalk extends HydratableAction<typeof Walk> implements Walk {
    declare type: ActionType.Walk
    declare playerId: string
    declare fromRow: number
    declare fromCol: number
    declare toRow: number
    declare toCol: number

    constructor(data: Walk) {
        super(data, WalkValidator)
    }

    apply(state: HydratedDolmengotterGameState, _context?: MachineContext) {
        const from = { row: this.fromRow, col: this.fromCol }
        const to = { row: this.toRow, col: this.toCol }
        const druid = state.getPlayerState(this.playerId).druidAt(from.row, from.col)
        assert(druid !== undefined, 'The player has no druid on that stone place')
        assert(!druid.belly, 'A druid on its belly can only fly')
        const reachable = walkDestinations(state.occupancy, from)
        assert(
            reachable.some((place) => place.row === to.row && place.col === to.col),
            'The druid cannot walk to that stone place'
        )
        druid.row = to.row
        druid.col = to.col
        state.vacatedPlace = from
    }
}
