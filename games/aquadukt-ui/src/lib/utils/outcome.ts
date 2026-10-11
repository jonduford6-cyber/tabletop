import { leadingPlayerIds, type PlayerTally } from '@tabletop/aquadukt'

export type OutcomeBasis = 'houses' | 'tiles' | 'shared'

export type Outcome = {
    winnerIds: string[]
    basis: OutcomeBasis
}

export function describeOutcome(tallies: readonly PlayerTally[]): Outcome {
    const winnerIds = leadingPlayerIds(tallies)
    const mostHouses = Math.max(...tallies.map((tally) => tally.houses))
    const tiedOnHouses = tallies.filter((tally) => tally.houses === mostHouses).length
    if (winnerIds.length > 1) return { winnerIds, basis: 'shared' }
    return { winnerIds, basis: tiedOnHouses > 1 ? 'tiles' : 'houses' }
}
