import * as Type from 'typebox'
import { Compile } from 'typebox/compile'
import { GameAction, HydratableAction, assert, type MachineContext } from '@tabletop/common'
import { ActionType } from '../definition/actions.js'
import { CounterKind, TurnAction, type HydratedFreibeuterGameState } from '../model/gameState.js'

export type CaptureShip = Type.Static<typeof CaptureShip>
export const CaptureShip = Type.Evaluate(
    Type.Intersect([
        Type.Omit(GameAction, ['playerId']),
        Type.Object({
            type: Type.Literal(ActionType.CaptureShip),
            playerId: Type.String(),
            intersection: Type.String()
        })
    ])
)

export const CaptureShipValidator = Compile(CaptureShip)

export function isCaptureShip(action?: GameAction): action is CaptureShip {
    return action?.type === ActionType.CaptureShip
}

export class HydratedCaptureShip
    extends HydratableAction<typeof CaptureShip>
    implements CaptureShip
{
    declare type: ActionType.CaptureShip
    declare playerId: string
    declare intersection: string

    constructor(data: CaptureShip) {
        super(data, CaptureShipValidator)
    }

    apply(state: HydratedFreibeuterGameState, _context?: MachineContext) {
        const counter = state.counterAt(this.intersection)
        assert(counter !== undefined, 'There is no counter on that intersection')
        assert(counter.kind === CounterKind.Ship, 'Only a ship can be captured')
        assert(counter.captorId === undefined, 'That ship has already been captured')
        const player = state.getPlayerState(this.playerId)
        assert(player.placeableBoats > 0, 'The player has no boat to place')
        player.boats -= 1
        counter.captorId = this.playerId
        state.turnAction = TurnAction.Capture
    }
}
