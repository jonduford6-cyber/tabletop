import * as Type from 'typebox'
import { Compile } from 'typebox/compile'
import { GameAction, HydratableAction, assert, type MachineContext } from '@tabletop/common'
import { ActionType } from '../definition/actions.js'
import { DRUIDS_PER_PLAYER } from '../definition/setup.js'
import { board } from '../components/board.js'
import { isFreePlace } from '../util/moves.js'
import type { HydratedDolmengotterGameState } from '../model/gameState.js'

export type PlaceDruid = Type.Static<typeof PlaceDruid>
export const PlaceDruid = Type.Evaluate(
    Type.Intersect([
        Type.Omit(GameAction, ['playerId']),
        Type.Object({
            type: Type.Literal(ActionType.PlaceDruid),
            playerId: Type.String(),
            row: Type.Number(),
            col: Type.Number()
        })
    ])
)

export const PlaceDruidValidator = Compile(PlaceDruid)

export function isPlaceDruid(action?: GameAction): action is PlaceDruid {
    return action?.type === ActionType.PlaceDruid
}

export class HydratedPlaceDruid extends HydratableAction<typeof PlaceDruid> implements PlaceDruid {
    declare type: ActionType.PlaceDruid
    declare playerId: string
    declare row: number
    declare col: number

    constructor(data: PlaceDruid) {
        super(data, PlaceDruidValidator)
    }

    apply(state: HydratedDolmengotterGameState, _context?: MachineContext) {
        const player = state.getPlayerState(this.playerId)
        assert(player.druids.length < DRUIDS_PER_PLAYER, 'The player has no druid left to place')
        assert(board.isStonePlace(this), 'That is not a stone place')
        assert(isFreePlace(state.occupancy, this), 'That stone place is not free')
        player.druids.push({ row: this.row, col: this.col, belly: false })
    }
}
