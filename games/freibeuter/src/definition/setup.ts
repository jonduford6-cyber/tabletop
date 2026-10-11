export const BOATS_PER_PLAYER = 25
export const START_TREASURE = 20
export const START_SEA_CARDS = 4
export const START_DUTCHMAN_CARDS = 1
export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 4

export const SEA_SPACE_COUNT = 49
export const OUTSIDE_SPACE_COUNT = 24
export const INTERSECTION_COUNT = 36
export const SEA_CARD_TOTAL = 74
export const DUTCHMAN_CARD_TOTAL = 14

export const SHIP_VALUES = [5, 10, 15, 20] as const
export const SHIPS_PER_VALUE = 7
export const CHEST_COUNT = 4
export const CHEST_PAYMENT = 2
export const TAKE_TREASURE_AMOUNT = 2
export const LOAN_REPAYMENT_FACTOR = 2

export function shipPayment(value: number): number {
    return value / 5
}

export function dealtSeaCards(numPlayers: number): number {
    return numPlayers * START_SEA_CARDS
}
