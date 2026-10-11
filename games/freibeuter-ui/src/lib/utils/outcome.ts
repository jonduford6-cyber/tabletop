import { shipWorth } from '@tabletop/freibeuter'

export type ShipLine = { value: number; worth: number; doubled: boolean }

export type Breakdown = {
    playerId: string
    treasure: number
    ships: ShipLine[]
    shipTotal: number
    loans: number
    loanCost: number
    total: number
}

export function breakdownOf(
    player: { playerId: string; treasure: number; ships: number[]; loans: number },
    removedDoublings: readonly number[]
): Breakdown {
    const ships = player.ships
        .toSorted((a, b) => b - a)
        .map((value) => {
            const worth = shipWorth(value, removedDoublings)
            return { value, worth, doubled: worth !== value }
        })
    const shipTotal = ships.reduce((sum, ship) => sum + ship.worth, 0)
    const loanCost = 2 * player.loans
    return {
        playerId: player.playerId,
        treasure: player.treasure,
        ships,
        shipTotal,
        loans: player.loans,
        loanCost,
        total: player.treasure + shipTotal - loanCost
    }
}

export function rankBreakdowns(breakdowns: readonly Breakdown[]): Breakdown[] {
    return breakdowns.toSorted((a, b) => b.total - a.total)
}
