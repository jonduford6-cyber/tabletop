import { Compile } from 'typebox/compile'
import { DrawBag, HydratedDrawBag, Visibility, type RandomFunction } from '@tabletop/common'
import * as Type from 'typebox'
import { Card } from './cards.js'

export type CardPile = Type.Static<typeof CardPile>
export const CardPile = DrawBag(Card)

export const CardPileValidator = Compile(CardPile)
const CardPileProjection = Visibility.createProjectionSchema(CardPile)
const CardPileProjectionValidator = Compile(CardPileProjection)

export class HydratedCardPile
    extends HydratedDrawBag<Card, typeof CardPileProjection>
    implements CardPile
{
    static generate(cards: Card[], random: RandomFunction): HydratedCardPile {
        const pile = new HydratedCardPile({
            items: structuredClone(cards),
            remaining: cards.length
        })
        pile.shuffle(random)
        return pile
    }

    constructor(data: CardPile) {
        super(data, CardPileProjectionValidator)
    }
}
