import { board } from '@tabletop/dolmengotter'
import type { HydratedDolmengotterGameState } from '@tabletop/dolmengotter'

export type StackItem = { playerId: string; label?: number }

export type CircleStack = { circleId: number; items: StackItem[] }

export function circleStacks(
    state: HydratedDolmengotterGameState,
    viewerId: string | undefined
): CircleStack[] {
    return board.circles.map((circle) => ({
        circleId: circle.id,
        items: state.circles[circle.id].batch.map((dolmen) => ({
            playerId: dolmen.playerId,
            ...(dolmen.playerId === viewerId && dolmen.value !== undefined
                ? { label: dolmen.value }
                : {})
        }))
    }))
}

export type StockEntry = { value: number; count: number }

export function stockOf(
    state: HydratedDolmengotterGameState,
    playerId: string,
    viewerId: string | undefined
): StockEntry[] | undefined {
    if (playerId !== viewerId) return undefined
    const counts = new Map<number, number>()
    for (const value of state.getPlayerState(playerId).dolmens) {
        counts.set(value, (counts.get(value) ?? 0) + 1)
    }
    return [...counts.entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.value - a.value)
}
