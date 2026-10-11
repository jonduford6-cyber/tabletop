import type { OffsetCoordinates } from '@tabletop/common'
import { BOARD_DATA } from '../definition/boardData.js'
import {
    CIRCLE_COUNT,
    CIRCLE_SIZE,
    FACTORS_TOP_DOWN,
    MIN_PLACES_FOR_FIVE_PLAYERS,
    type CircleShape
} from '../definition/setup.js'

export type PlaceTuple = readonly [number, number]

export type BoardData = {
    stonePlaceColumnsByRow: Record<number, number[]>
    circles: { shape: CircleShape; printedFactor: number; stonePlaces: PlaceTuple[] }[]
    borderLinks: [PlaceTuple, PlaceTuple][]
    cornerLinks: [PlaceTuple, PlaceTuple][]
    scoringTrack: { first: number; last: number; startField: number }
}

export type Circle = {
    id: number
    shape: CircleShape
    printedFactor: number
    places: OffsetCoordinates[]
}

export function placeKey(place: OffsetCoordinates): string {
    return `${place.row},${place.col}`
}

function tupleKey(tuple: PlaceTuple): string {
    return `${tuple[0]},${tuple[1]}`
}

function toPlace(tuple: PlaceTuple): OffsetCoordinates {
    return { row: tuple[0], col: tuple[1] }
}

export function checkBoardData(data: BoardData): string[] {
    const problems: string[] = []
    const places = new Set<string>()
    for (const [row, columns] of Object.entries(data.stonePlaceColumnsByRow)) {
        for (const col of columns) {
            const key = `${row},${col}`
            if (places.has(key)) problems.push(`Stone place (${key}) is listed twice`)
            places.add(key)
        }
    }
    if (places.size < MIN_PLACES_FOR_FIVE_PLAYERS) {
        problems.push(
            `Only ${places.size} stone places; a 5-player game needs at least ${MIN_PLACES_FOR_FIVE_PLAYERS}`
        )
    }
    if (data.circles.length !== CIRCLE_COUNT) {
        problems.push(`Expected ${CIRCLE_COUNT} circles but found ${data.circles.length}`)
    }

    const circlesPerPlace = new Map<string, number>()
    data.circles.forEach((circle, index) => {
        const name = `Circle ${index + 1} (${circle.shape})`
        const size = CIRCLE_SIZE[circle.shape]
        if (size === undefined) {
            problems.push(`${name} has an unknown shape`)
            return
        }
        if (circle.stonePlaces.length !== size) {
            problems.push(`${name} has ${circle.stonePlaces.length} stone places, expected ${size}`)
        }
        const keys = circle.stonePlaces.map(tupleKey)
        if (new Set(keys).size !== keys.length) problems.push(`${name} repeats a stone place`)
        for (const key of keys) {
            if (!places.has(key)) problems.push(`${name} uses (${key}), which is not a stone place`)
            circlesPerPlace.set(key, (circlesPerPlace.get(key) ?? 0) + 1)
        }
        if (circle.printedFactor !== FACTORS_TOP_DOWN[circle.shape][0]) {
            problems.push(
                `${name} prints ${circle.printedFactor} but the top factor of its shape is ${FACTORS_TOP_DOWN[circle.shape][0]}`
            )
        }
    })

    for (const key of places) {
        const count = circlesPerPlace.get(key) ?? 0
        if (count < 1) problems.push(`Stone place (${key}) is in no circle`)
        if (count > 3)
            problems.push(`Stone place (${key}) is in ${count} circles, at most 3 allowed`)
    }

    const borderKeys = new Set([...places].filter((key) => (circlesPerPlace.get(key) ?? 0) < 3))
    const linked = new Map<string, number>()
    for (const [a, b] of data.borderLinks) {
        for (const tuple of [a, b]) {
            const key = tupleKey(tuple)
            if (!places.has(key))
                problems.push(`Border link uses (${key}), which is not a stone place`)
            else if (!borderKeys.has(key))
                problems.push(`Border link uses (${key}), which is not a border place`)
            linked.set(key, (linked.get(key) ?? 0) + 1)
        }
        if (tupleKey(a) === tupleKey(b))
            problems.push(`Border link joins (${tupleKey(a)}) to itself`)
    }
    const cornerPartners = new Map<string, Set<string>>()
    for (const [a, b] of data.cornerLinks) {
        for (const [from, to] of [
            [a, b],
            [b, a]
        ]) {
            const key = tupleKey(from)
            if (!places.has(key))
                problems.push(`Corner link uses (${key}), which is not a stone place`)
            else if (!borderKeys.has(key))
                problems.push(`Corner link uses (${key}), which is not a border place`)
            if (!cornerPartners.has(key)) cornerPartners.set(key, new Set())
            cornerPartners.get(key)?.add(tupleKey(to))
        }
    }
    if (cornerPartners.size !== 4) {
        problems.push(`Expected 4 corner places but found ${cornerPartners.size}`)
    }
    for (const [key, partners] of cornerPartners) {
        if (partners.size !== 3)
            problems.push(`Corner (${key}) has ${partners.size} jump targets, expected 3`)
        if (linked.has(key)) problems.push(`Corner (${key}) is also in a border link`)
    }
    for (const key of borderKeys) {
        const count = (linked.get(key) ?? 0) + (cornerPartners.has(key) ? 1 : 0)
        if (count !== 1)
            problems.push(`Border place (${key}) has ${count} links, expected exactly 1`)
    }

    const track = data.scoringTrack
    if (!(track.first <= track.startField && track.startField <= track.last)) {
        problems.push('The scoring track start field is outside the track')
    }
    return problems
}

export class Board {
    readonly places: OffsetCoordinates[]
    readonly circles: Circle[]
    readonly scoringTrack: BoardData['scoringTrack']
    private readonly placeKeys: Set<string>
    private readonly circlesByPlace = new Map<string, number[]>()
    private readonly neighbourKeys = new Map<string, OffsetCoordinates[]>()
    private readonly borderKeys: Set<string>

    constructor(data: BoardData) {
        const problems = checkBoardData(data)
        if (problems.length > 0) {
            throw Error(`The board data is inconsistent:\n- ${problems.join('\n- ')}`)
        }

        this.places = Object.entries(data.stonePlaceColumnsByRow).flatMap(([row, columns]) =>
            columns.map((col) => ({ row: Number(row), col }))
        )
        this.placeKeys = new Set(this.places.map(placeKey))
        this.scoringTrack = data.scoringTrack
        this.circles = data.circles.map((circle, id) => ({
            id,
            shape: circle.shape,
            printedFactor: circle.printedFactor,
            places: circle.stonePlaces.map(toPlace)
        }))

        for (const place of this.places) {
            this.circlesByPlace.set(placeKey(place), [])
            this.neighbourKeys.set(placeKey(place), [])
        }
        const linkSeen = new Set<string>()
        const link = (a: PlaceTuple, b: PlaceTuple) => {
            const [ka, kb] = [tupleKey(a), tupleKey(b)]
            const pair = [ka, kb].sort().join('|')
            if (linkSeen.has(pair)) return
            linkSeen.add(pair)
            this.neighbourKeys.get(ka)?.push(toPlace(b))
            this.neighbourKeys.get(kb)?.push(toPlace(a))
        }
        for (const circle of this.circles) {
            circle.places.forEach((place, index) => {
                this.circlesByPlace.get(placeKey(place))?.push(circle.id)
                const next = circle.places[(index + 1) % circle.places.length]
                link([place.row, place.col], [next.row, next.col])
            })
        }
        for (const [a, b] of [...data.borderLinks, ...data.cornerLinks]) link(a, b)

        this.borderKeys = new Set(
            this.places
                .filter((place) => (this.circlesByPlace.get(placeKey(place)) ?? []).length < 3)
                .map(placeKey)
        )
    }

    isStonePlace(place: OffsetCoordinates): boolean {
        return this.placeKeys.has(placeKey(place))
    }

    isBorder(place: OffsetCoordinates): boolean {
        return this.borderKeys.has(placeKey(place))
    }

    circlesAt(place: OffsetCoordinates): number[] {
        return this.circlesByPlace.get(placeKey(place)) ?? []
    }

    neighbours(place: OffsetCoordinates): OffsetCoordinates[] {
        return this.neighbourKeys.get(placeKey(place)) ?? []
    }

    circle(id: number): Circle {
        const circle = this.circles[id]
        if (!circle) throw Error(`There is no circle ${id}`)
        return circle
    }
}

export const board = new Board(BOARD_DATA)
