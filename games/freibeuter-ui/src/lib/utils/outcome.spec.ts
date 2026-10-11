import { describe, expect, it } from 'vitest'
import { breakdownOf, rankBreakdowns } from './outcome.js'

describe('breakdownOf', () => {
    it('reproduces the rulebook example: 126 with the doubling counters 10 and 15 removed', () => {
        const breakdown = breakdownOf(
            { playerId: 'brigit', treasure: 36, ships: [5, 5, 15, 15, 20], loans: 0 },
            [10, 15]
        )
        expect(breakdown.total).toBe(126)
        expect(breakdown.shipTotal).toBe(5 + 5 + 30 + 30 + 20)
        expect(breakdown.ships.filter((ship) => ship.doubled)).toHaveLength(2)
    })

    it('doubles a 10/2 ship to 20 and subtracts twice the loans', () => {
        const breakdown = breakdownOf({ playerId: 'x', treasure: 10, ships: [10], loans: 7 }, [10])
        expect(breakdown.ships).toEqual([{ value: 10, worth: 20, doubled: true }])
        expect(breakdown.loanCost).toBe(14)
        expect(breakdown.total).toBe(10 + 20 - 14)
    })

    it('does not double a ship whose counter was not removed', () => {
        const breakdown = breakdownOf({ playerId: 'x', treasure: 0, ships: [20], loans: 0 }, [5])
        expect(breakdown.total).toBe(20)
    })
})

describe('rankBreakdowns', () => {
    it('orders players by total', () => {
        const rows = [
            breakdownOf({ playerId: 'a', treasure: 10, ships: [], loans: 0 }, []),
            breakdownOf({ playerId: 'b', treasure: 50, ships: [], loans: 0 }, []),
            breakdownOf({ playerId: 'c', treasure: 30, ships: [], loans: 0 }, [])
        ]
        expect(rankBreakdowns(rows).map((row) => row.playerId)).toEqual(['b', 'c', 'a'])
    })
})
