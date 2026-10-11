import { LOAN_REPAYMENT_FACTOR } from '../definition/setup.js'

export type Scorable = { playerId: string; treasure: number; ships: number[]; loans: number }

export function shipWorth(value: number, removedDoublings: readonly number[]): number {
    return removedDoublings.includes(value) ? value * 2 : value
}

export function finalScore(player: Scorable, removedDoublings: readonly number[]): number {
    const ships = player.ships.reduce((sum, value) => sum + shipWorth(value, removedDoublings), 0)
    return player.treasure + ships - LOAN_REPAYMENT_FACTOR * player.loans
}

export function winnersOf(
    players: readonly Scorable[],
    removedDoublings: readonly number[]
): string[] {
    const best = Math.max(...players.map((player) => finalScore(player, removedDoublings)))
    return players
        .filter((player) => finalScore(player, removedDoublings) === best)
        .map((player) => player.playerId)
}
