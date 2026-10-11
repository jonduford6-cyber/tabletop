import * as Type from 'typebox'
import { Compile } from 'typebox/compile'
import { GameAction, HydratableAction, assert, type MachineContext } from '@tabletop/common'
import { ActionType } from '../definition/actions.js'
import { TAKE_TREASURE_AMOUNT } from '../definition/setup.js'
import { board } from '../components/board.js'
import { seaCard } from '../components/cards.js'
import { TurnAction, type HydratedFreibeuterGameState } from '../model/gameState.js'

export type PlaySeaCard = Type.Static<typeof PlaySeaCard>
export const PlaySeaCard = Type.Evaluate(
    Type.Intersect([
        Type.Omit(GameAction, ['playerId']),
        Type.Object({
            type: Type.Literal(ActionType.PlaySeaCard),
            playerId: Type.String(),
            space: Type.String(),
            takeTreasure: Type.Optional(Type.Boolean())
        })
    ])
)

export const PlaySeaCardValidator = Compile(PlaySeaCard)

export function isPlaySeaCard(action?: GameAction): action is PlaySeaCard {
    return action?.type === ActionType.PlaySeaCard
}

export class HydratedPlaySeaCard
    extends HydratableAction<typeof PlaySeaCard>
    implements PlaySeaCard
{
    declare type: ActionType.PlaySeaCard
    declare playerId: string
    declare space: string
    declare takeTreasure?: boolean

    constructor(data: PlaySeaCard) {
        super(data, PlaySeaCardValidator)
    }

    apply(state: HydratedFreibeuterGameState, _context?: MachineContext) {
        assert(board.isSpace(this.space), 'That is not a sea space')
        const player = state.getPlayerState(this.playerId)
        const card = seaCard(this.space)
        assert(player.holds(card), 'The player does not hold that sea card')
        const occupied = state.hasBoat(this.space)
        if (this.takeTreasure) {
            assert(occupied, 'Treasure can only be taken instead of a boat on an occupied space')
        } else {
            assert(player.placeableBoats > 0, 'The player has no boat to place')
        }

        player.takeCard(card)
        state.seaDiscard.push(card)
        if (this.takeTreasure) {
            player.treasure += TAKE_TREASURE_AMOUNT
        } else {
            player.boats -= 1
            state.placedBoats.push({ space: this.space, playerId: this.playerId })
        }
        state.surrounded = state.findSurrounded()
        state.turnAction = TurnAction.Sea
    }
}
