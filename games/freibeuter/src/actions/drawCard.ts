import * as Type from 'typebox'
import { Compile } from 'typebox/compile'
import {
    GameAction,
    HydratableAction,
    Visibility,
    assert,
    type MachineContext
} from '@tabletop/common'
import { ActionType } from '../definition/actions.js'
import { Card } from '../components/cards.js'
import { Pile, type HydratedFreibeuterGameState } from '../model/gameState.js'

export type DrawCard = Type.Static<typeof DrawCard>
export const DrawCard = Type.Evaluate(
    Type.Intersect([
        Type.Omit(GameAction, ['type', 'playerId']),
        Type.Object({
            type: Type.Literal(ActionType.DrawCard),
            playerId: Type.String(),
            revealsInfo: Type.Literal(true),
            pile: Type.Enum(Pile),
            card: Type.Optional(Visibility.protect(Card, { policy: Visibility.Policy.Actor }))
        })
    ])
)

export const DrawCardValidator = Compile(DrawCard)

export function isDrawCard(action?: GameAction): action is DrawCard {
    return action?.type === ActionType.DrawCard
}

export class HydratedDrawCard extends HydratableAction<typeof DrawCard> implements DrawCard {
    declare type: ActionType.DrawCard
    declare playerId: string
    declare revealsInfo: true
    declare pile: Pile
    declare card?: Card

    constructor(data: DrawCard) {
        super(data, DrawCardValidator)
    }

    apply(state: HydratedFreibeuterGameState, _context?: MachineContext) {
        assert(
            state.drawChoices(this.playerId).includes(this.pile),
            'The player may not draw from that pile'
        )
        const pile = this.pile === Pile.Sea ? state.seaPile : state.dutchmanPile
        const card = pile.draw()
        state.getPlayerState(this.playerId).addCard(card)
        this.card = card
    }
}
