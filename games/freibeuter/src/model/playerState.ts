import { Color, Hydratable, PlayerState, Visibility } from '@tabletop/common'
import * as Type from 'typebox'
import { Compile } from 'typebox/compile'
import { Card, CardType, removeOne } from '../components/cards.js'

export type FreibeuterPlayerState = Type.Static<typeof FreibeuterPlayerState>
export const FreibeuterPlayerState = Type.Evaluate(
    Type.Intersect([
        PlayerState,
        Type.Object({
            boats: Type.Number(),
            treasure: Type.Number(),
            loans: Type.Number(),
            ships: Type.Array(Type.Number()),
            seaCount: Type.Number(),
            dutchmanCount: Type.Number(),
            hand: Visibility.protect(Type.Array(Card), {
                policy: Visibility.Policy.Owner,
                redaction: Visibility.redaction.emptyArray()
            })
        })
    ])
)

export const FreibeuterPlayerStateValidator = Compile(FreibeuterPlayerState)

export const FreibeuterProjectedPlayerState =
    Visibility.createProjectionSchema(FreibeuterPlayerState)
export type FreibeuterProjectedPlayerState = Type.Static<typeof FreibeuterProjectedPlayerState>
const FreibeuterProjectedPlayerStateValidator = Compile(FreibeuterProjectedPlayerState)

export class HydratedFreibeuterPlayerState
    extends Hydratable<typeof FreibeuterProjectedPlayerState>
    implements FreibeuterProjectedPlayerState
{
    declare playerId: string
    declare color: Color
    declare boats: number
    declare treasure: number
    declare loans: number
    declare ships: number[]
    declare seaCount: number
    declare dutchmanCount: number
    declare hand: Card[]

    constructor(data: FreibeuterProjectedPlayerState) {
        super(data, FreibeuterProjectedPlayerStateValidator)
    }

    get blockedBoats(): number {
        return this.loans > 0 ? 1 : 0
    }

    get placeableBoats(): number {
        return this.boats - this.blockedBoats
    }

    addCard(card: Card) {
        this.hand.push(card)
        if (card.type === CardType.Sea) this.seaCount += 1
        else this.dutchmanCount += 1
    }

    takeCard(card: Card) {
        if (!removeOne(this.hand, card)) throw Error('The player does not hold that card')
        if (card.type === CardType.Sea) this.seaCount -= 1
        else this.dutchmanCount -= 1
    }

    holds(card: Card): boolean {
        return this.hand.some((held) => held.type === card.type && held.target === card.target)
    }
}
