import * as Type from 'typebox'
import { Compile } from 'typebox/compile'
import { GameAction, HydratableAction, assert, type MachineContext } from '@tabletop/common'
import { ActionType } from '../definition/actions.js'
import { board } from '../components/board.js'
import type { HydratedDolmengotterGameState } from '../model/gameState.js'

export type DeclineStone = Type.Static<typeof DeclineStone>
export const DeclineStone = Type.Evaluate(
    Type.Intersect([
        Type.Omit(GameAction, ['playerId']),
        Type.Object({
            type: Type.Literal(ActionType.DeclineStone),
            playerId: Type.String()
        })
    ])
)

export const DeclineStoneValidator = Compile(DeclineStone)

export function isDeclineStone(action?: GameAction): action is DeclineStone {
    return action?.type === ActionType.DeclineStone
}

export class HydratedDeclineStone
    extends HydratableAction<typeof DeclineStone>
    implements DeclineStone
{
    declare type: ActionType.DeclineStone
    declare playerId: string

    constructor(data: DeclineStone) {
        super(data, DeclineStoneValidator)
    }

    apply(state: HydratedDolmengotterGameState, _context?: MachineContext) {
        assert(state.vacatedPlace !== undefined, 'There is no stone decision to make')
        const player = state.getPlayerState(this.playerId)
        assert(player.stones > 0, 'A player without stones is not asked about a stone')
        assert(
            HydratedDeclineStone.canDecline(state, this.playerId),
            'A player whose marker is on the first field must place a stone'
        )
        player.points -= 1
        state.vacatedPlace = undefined
    }

    static canDecline(state: HydratedDolmengotterGameState, playerId: string): boolean {
        const player = state.getPlayerState(playerId)
        return player.points > board.scoringTrack.first
    }
}
