import * as Type from 'typebox'
import { Compile } from 'typebox/compile'
import { GameAction, HydratableAction, assert, type MachineContext } from '@tabletop/common'
import { ActionType } from '../definition/actions.js'
import { board } from '../components/board.js'
import { isFreePlace } from '../util/moves.js'
import type { HydratedDolmengotterGameState } from '../model/gameState.js'

export type Flight = Type.Static<typeof Flight>
export const Flight = Type.Evaluate(
    Type.Intersect([
        Type.Omit(GameAction, ['playerId']),
        Type.Object({
            type: Type.Literal(ActionType.Flight),
            playerId: Type.String(),
            fromRow: Type.Number(),
            fromCol: Type.Number(),
            toRow: Type.Number(),
            toCol: Type.Number()
        })
    ])
)

export const FlightValidator = Compile(Flight)

export function isFlight(action?: GameAction): action is Flight {
    return action?.type === ActionType.Flight
}

export class HydratedFlight extends HydratableAction<typeof Flight> implements Flight {
    declare type: ActionType.Flight
    declare playerId: string
    declare fromRow: number
    declare fromCol: number
    declare toRow: number
    declare toCol: number

    constructor(data: Flight) {
        super(data, FlightValidator)
    }

    apply(state: HydratedDolmengotterGameState, _context?: MachineContext) {
        const from = { row: this.fromRow, col: this.fromCol }
        const to = { row: this.toRow, col: this.toCol }
        const druid = state.getPlayerState(this.playerId).druidAt(from.row, from.col)
        assert(druid !== undefined, 'The player has no druid on that stone place')
        assert(druid.belly, 'Only a druid lying on its belly can fly')
        assert(board.isStonePlace(to), 'That is not a stone place')
        assert(from.row !== to.row || from.col !== to.col, 'The druid must land on another place')
        assert(isFreePlace(state.occupancy, to), 'That stone place is not free')
        druid.row = to.row
        druid.col = to.col
        druid.belly = false
        state.vacatedPlace = from
    }
}
