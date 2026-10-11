export type DolmenEventKind = 'majority' | 'equalizer'

export type DolmenEvent = { playerId: string; kind: DolmenEventKind }

export type StoneCounts = Readonly<Record<string, number>>

function maxCount(counts: StoneCounts): number {
    return Math.max(0, ...Object.values(counts))
}

export function majorityHolder(counts: StoneCounts): string | undefined {
    const top = maxCount(counts)
    const leaders = Object.entries(counts).filter(([, count]) => count === top)
    const coloursPresent = Object.values(counts).filter((count) => count >= 1).length
    if (leaders.length !== 1 || top < 2 || coloursPresent < 2) return undefined
    return leaders[0][0]
}

export function dolmenEventForStone(input: {
    before: StoneCounts
    placedBy: string
    hadMajority: boolean
}): DolmenEvent | undefined {
    const { before, placedBy, hadMajority } = input
    const after = { ...before, [placedBy]: (before[placedBy] ?? 0) + 1 }
    const holderBefore = majorityHolder(before)
    const holderAfter = majorityHolder(after)
    if (holderAfter !== undefined && holderAfter !== holderBefore) {
        return { playerId: holderAfter, kind: 'majority' }
    }
    const topBefore = maxCount(before)
    if (hadMajority && (before[placedBy] ?? 0) < topBefore && after[placedBy] === topBefore) {
        return { playerId: placedBy, kind: 'equalizer' }
    }
    return undefined
}
