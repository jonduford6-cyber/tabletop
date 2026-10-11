export type Standing = { playerId: string; points: number; dolmensPlaced: number }

export type OutcomeBasis = 'points' | 'dolmens' | 'shared'

export type Outcome = { winnerIds: string[]; basis: OutcomeBasis }

export function describeOutcome(standings: readonly Standing[]): Outcome {
    const best = Math.max(...standings.map((standing) => standing.points))
    const leaders = standings.filter((standing) => standing.points === best)
    if (leaders.length === 1) return { winnerIds: [leaders[0].playerId], basis: 'points' }
    const mostBuilt = Math.max(...leaders.map((standing) => standing.dolmensPlaced))
    const builders = leaders.filter((standing) => standing.dolmensPlaced === mostBuilt)
    return {
        winnerIds: builders.map((standing) => standing.playerId),
        basis: builders.length === 1 ? 'dolmens' : 'shared'
    }
}

export function rankStandings<T extends Standing>(standings: readonly T[]): T[] {
    return standings.toSorted((a, b) => b.points - a.points || b.dolmensPlaced - a.dolmensPlaced)
}
