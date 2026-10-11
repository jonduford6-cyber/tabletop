import * as Type from 'typebox'
import { board } from './board.js'

export enum CardType {
    Sea = 'sea',
    Dutchman = 'dutchman'
}

export type Card = Type.Static<typeof Card>
export const Card = Type.Object({
    type: Type.Enum(CardType),
    target: Type.String()
})

export function seaCard(space: string): Card {
    return { type: CardType.Sea, target: space }
}

export function dutchmanCard(target: string): Card {
    return { type: CardType.Dutchman, target }
}

export function allSeaCards(): Card[] {
    return board.spaces.flatMap((space) =>
        Array.from({ length: board.seaCardCopies[space] }, () => seaCard(space))
    )
}

export function allDutchmanCards(): Card[] {
    return board.dutchmanCards.map(dutchmanCard)
}

export function sameCard(a: Card, b: Card): boolean {
    return a.type === b.type && a.target === b.target
}

export function removeOne(cards: Card[], card: Card): boolean {
    const index = cards.findIndex((candidate) => sameCard(candidate, card))
    if (index < 0) return false
    cards.splice(index, 1)
    return true
}
