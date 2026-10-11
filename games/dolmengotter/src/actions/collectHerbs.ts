import * as Type from 'typebox'
import { Compile } from 'typebox/compile'
import { GameAction, HydratableAction, assert, type MachineContext } from '@tabletop/common'
import { ActionType } from '../definition/actions.js'
import type { HydratedDolmengotterGameState } from '../model/gameState.js'

export type CollectHerbs = Type.Static<typeof CollectHerbs>
export const CollectHerbs = Type.Evaluate(
    Type.Intersect([
        Type.Omit(GameAction, ['playerId']),
        Type.Object({
            type: Type.Literal(ActionType.CollectHerbs),
            playerId: Type.String(),
            row: Type.Number(),
            col: Type.Number()
        })
    ])
)

export const CollectHerbsValidator = Compile(CollectHerbs)

export function isCollectHerbs(action?: GameAction): action is CollectHerbs {
    return action?.type === ActionType.CollectHerbs
}

export class HydratedCollectHerbs
    extends HydratableAction<typeof CollectHerbs>
    implements CollectHerbs
{
    declare type: ActionType.CollectHerbs
    declare playerId: string
    declare row: number
    declare col: number

    constructor(data: CollectHerbs) {
        super(data, CollectHerbsValidator)
    }

    apply(state: HydratedDolmengotterGameState, _context?: MachineContext) {
        const druid = state.getPlayerState(this.playerId).druidAt(this.row, this.col)
        assert(druid !== undefined, 'The player has no druid on that stone place')
        assert(!druid.belly, 'That druid is already lying on its belly')
        druid.belly = true
    }
}
