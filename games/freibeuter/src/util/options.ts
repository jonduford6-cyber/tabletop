import { board } from '../components/board.js'
import { CardType } from '../components/cards.js'
import type { HydratedFreibeuterGameState } from '../model/gameState.js'

export type DutchmanOption = { card: string; space: string }

export function surroundedWithDutchmanAt(
    state: HydratedFreibeuterGameState,
    space: string
): string[] {
    return board
        .intersectionsAround(space)
        .filter((id) => state.counterAt(id) !== undefined)
        .filter((id) =>
            board
                .intersection(id)
                .spaces.every((around) => around === space || state.hasBoat(around))
        )
}

export function dutchmanOptions(
    state: HydratedFreibeuterGameState,
    playerId: string
): DutchmanOption[] {
    const targets = new Set(
        state
            .getPlayerState(playerId)
            .hand.filter((card) => card.type === CardType.Dutchman)
            .map((card) => card.target)
    )
    return [...targets].flatMap((card) =>
        board
            .spacesOfLine(card)
            .filter((space) => surroundedWithDutchmanAt(state, space).length > 0)
            .map((space) => ({ card, space }))
    )
}

export function canCapture(state: HydratedFreibeuterGameState, playerId: string): boolean {
    return state.getPlayerState(playerId).placeableBoats > 0 && state.uncapturedShips().length > 0
}

export function canPlaySeaCard(state: HydratedFreibeuterGameState, playerId: string): boolean {
    const player = state.getPlayerState(playerId)
    return player.seaCount > 0 && player.placeableBoats > 0
}

export function canPlayDutchman(state: HydratedFreibeuterGameState, playerId: string): boolean {
    return dutchmanOptions(state, playerId).length > 0
}

export function hasLegalAction(state: HydratedFreibeuterGameState, playerId: string): boolean {
    return (
        canCapture(state, playerId) ||
        canPlaySeaCard(state, playerId) ||
        canPlayDutchman(state, playerId)
    )
}
