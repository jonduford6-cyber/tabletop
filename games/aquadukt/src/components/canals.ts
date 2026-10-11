import * as Type from 'typebox'
import type { OffsetCoordinates } from '@tabletop/common'
import {
    Edge,
    allEdges,
    edgeEndpoints,
    isEdgeOnBoard,
    isIntersectionOnBoard,
    gridDistance,
    samePoint,
    sameEdge
} from './geometry.js'
import {
    MAX_ARMS_PER_SPRING,
    MIN_SPRING_DISTANCE,
    NUM_CANALS,
    NUM_SPRINGS
} from '../definition/setup.js'

export type Canal = Type.Static<typeof Canal>
export const Canal = Type.Evaluate(Type.Intersect([Edge, Type.Object({ count: Type.Number() })]))

export type WaterworksState = {
    springs: readonly OffsetCoordinates[]
    canals: readonly Canal[]
}

export function canalPiecesUsed(canals: readonly Canal[]): number {
    return canals.reduce((total, canal) => total + canal.count, 0)
}

export function canalsRemaining(canals: readonly Canal[]): number {
    return NUM_CANALS - canalPiecesUsed(canals)
}

export function springsRemaining(springs: readonly OffsetCoordinates[]): number {
    return NUM_SPRINGS - springs.length
}

function canalsTouching(canals: readonly Canal[], point: OffsetCoordinates): Canal[] {
    return canals.filter((canal) => edgeEndpoints(canal).some((end) => samePoint(end, point)))
}

function isSpring(springs: readonly OffsetCoordinates[], point: OffsetCoordinates): boolean {
    return springs.some((spring) => samePoint(spring, point))
}

function otherEndpoint(edge: Edge, point: OffsetCoordinates): OffsetCoordinates {
    const [start, end] = edgeEndpoints(edge)
    return samePoint(start, point) ? end : start
}

function followArm(canals: readonly Canal[], spring: OffsetCoordinates, first: Canal): Canal[] {
    const arm = [first]
    let node = otherEndpoint(first, spring)
    let previous = first
    for (;;) {
        const next = canalsTouching(canals, node).find((canal) => !sameEdge(canal, previous))
        if (next === undefined) return arm
        arm.push(next)
        node = otherEndpoint(next, node)
        previous = next
    }
}

export function armsOf(canals: readonly Canal[], spring: OffsetCoordinates): Canal[][] {
    return canalsTouching(canals, spring).map((first) => followArm(canals, spring, first))
}

export function springPlacementProblem(
    { springs, canals }: WaterworksState,
    point: OffsetCoordinates
): string | undefined {
    if (springsRemaining(springs) <= 0) return 'No springs left to place'
    if (!isIntersectionOnBoard(point)) return 'Intersection is not on the board'
    if (isSpring(springs, point)) return 'There is already a spring on this intersection'
    if (canalsTouching(canals, point).length > 0) return 'A canal already touches this intersection'
    if (springs.some((spring) => gridDistance(spring, point) < MIN_SPRING_DISTANCE)) {
        return `Springs must be at least ${MIN_SPRING_DISTANCE} steps apart`
    }
    return undefined
}

function isDoubleAllowed(state: WaterworksState, canal: Canal): boolean {
    const [start, end] = edgeEndpoints(canal)
    if (isSpring(state.springs, start) || isSpring(state.springs, end)) return true
    for (const spring of state.springs) {
        for (const arm of armsOf(state.canals, spring)) {
            const index = arm.findIndex((candidate) => sameEdge(candidate, canal))
            if (index >= 0) return arm[index - 1].count === 2
        }
    }
    return false
}

function newEdgeProblem(state: WaterworksState, edge: Edge): string | undefined {
    const [start, end] = edgeEndpoints(edge)
    const touched = [start, end].filter(
        (point) => isSpring(state.springs, point) || canalsTouching(state.canals, point).length > 0
    )
    if (touched.length === 0) return 'A canal must start at a spring or the end of a canal'
    if (touched.length === 2) return 'A canal cannot join two systems or form a loop'
    const [anchor] = touched
    if (isSpring(state.springs, anchor)) {
        return canalsTouching(state.canals, anchor).length >= MAX_ARMS_PER_SPRING
            ? 'A spring can have at most two canal arms'
            : undefined
    }
    return canalsTouching(state.canals, anchor).length > 1 ? 'A canal cannot branch off' : undefined
}

export function canalPlacementProblem(state: WaterworksState, edge: Edge): string | undefined {
    if (canalsRemaining(state.canals) <= 0) return 'No canals left to place'
    if (state.springs.length === 0) return 'A spring must be discovered before building canals'
    if (!isEdgeOnBoard(edge)) return 'Edge is not on the board'
    const existing = state.canals.find((canal) => sameEdge(canal, edge))
    if (existing === undefined) return newEdgeProblem(state, edge)
    if (existing.count >= 2) return 'This edge already has a double canal'
    return isDoubleAllowed(state, existing)
        ? undefined
        : 'A double canal must start at a spring and continue from a double canal'
}

export function legalCanalEdges(state: WaterworksState): Edge[] {
    return allEdges().filter((edge) => canalPlacementProblem(state, edge) === undefined)
}

export function addCanalPiece(canals: Canal[], edge: Edge): number {
    const existing = canals.find((canal) => sameEdge(canal, edge))
    if (existing) {
        existing.count += 1
        return existing.count
    }
    canals.push({ ...edge, count: 1 })
    return 1
}
