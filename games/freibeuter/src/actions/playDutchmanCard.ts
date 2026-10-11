import * as Type from 'typebox'
import { Compile } from 'typebox/compile'
import { GameAction, HydratableAction, assert, type MachineContext } from '@tabletop/common'
import { ActionType } from '../definition/actions.js'
import { board } from '../components/board.js'
import { dutchmanCard } from '../components/cards.js'
import { TurnAction, type HydratedFreibeuterGameState } from '../model/gameState.js'

export type PlayDutchmanCard = Type.Static<typeof PlayDutchmanCard>
export const PlayDutchmanCard = Type.Evaluate(
    Type.Intersect([
        Type.Omit(GameAction, ['playerId']),
        Type.Object({
            type: Type.Literal(ActionType.PlayDutchmanCard),
            playerId: Type.String(),
            card: Type.String(),
            space: Type.String()
        })
    ])
)

export const PlayDutchmanCardValidator = Compile(PlayDutchmanCard)

export function isPlayDutchmanCard(action?: GameAction): action is PlayDutchmanCard {
    return action?.type === ActionType.PlayDutchmanCard
}

export class HydratedPlayDutchmanCard
    extends HydratableAction<typeof PlayDutchmanCard>
    implements PlayDutchmanCard
{
    declare type: ActionType.PlayDutchmanCard
    declare playerId: string
    declare card: string
    declare space: string

    constructor(data: PlayDutchmanCard) {
        super(data, PlayDutchmanCardValidator)
    }

    apply(state: HydratedFreibeuterGameState, _context?: MachineContext) {
        assert(board.isDutchmanCard(this.card), 'That is not a Flying Dutchman card')
        const player = state.getPlayerState(this.playerId)
        const card = dutchmanCard(this.card)
        assert(player.holds(card), 'The player does not hold that Flying Dutchman card')
        assert(
            board.spacesOfLine(this.card).includes(this.space),
            'That space is not in the row or column of the card'
        )

        state.dutchmanAt = this.space
        const surrounded = state.findSurrounded()
        assert(
            surrounded.length > 0,
            'A Flying Dutchman card may only be played if it surrounds something'
        )

        player.takeCard(card)
        state.dutchmanDiscard.push(card)
        state.surrounded = surrounded
        state.turnAction = TurnAction.Dutchman
    }
}
