import { BOARD_DATA } from '../definition/boardData.js'
import {
    DUTCHMAN_CARD_TOTAL,
    INTERSECTION_COUNT,
    OUTSIDE_SPACE_COUNT,
    SEA_CARD_TOTAL,
    SEA_SPACE_COUNT
} from '../definition/setup.js'

export type Intersection = { id: string; spaces: string[] }

export type BoardData = {
    rows: string[]
    columns: number[]
    outsideSpaces: string[]
    seaCardCopies: Record<string, number>
    dutchmanCards: string[]
    intersections: Intersection[]
}

export function checkBoardData(data: BoardData): string[] {
    const problems: string[] = []
    const spaces = data.rows.flatMap((row) => data.columns.map((column) => `${row}${column}`))
    const spaceSet = new Set(spaces)
    if (data.rows.length !== 7) problems.push(`Expected 7 rows but found ${data.rows.length}`)
    if (data.columns.length !== 7) {
        problems.push(`Expected 7 columns but found ${data.columns.length}`)
    }
    if (spaceSet.size !== SEA_SPACE_COUNT) {
        problems.push(`Expected ${SEA_SPACE_COUNT} sea spaces but found ${spaceSet.size}`)
    }

    if (data.intersections.length !== INTERSECTION_COUNT) {
        problems.push(
            `Expected ${INTERSECTION_COUNT} intersections but found ${data.intersections.length}`
        )
    }
    const ids = new Set<string>()
    const blocks = new Set<string>()
    const touching = new Map<string, number>(spaces.map((space) => [space, 0]))
    for (const intersection of data.intersections) {
        if (ids.has(intersection.id))
            problems.push(`Intersection ${intersection.id} is listed twice`)
        ids.add(intersection.id)
        const name = `Intersection ${intersection.id}`
        if (intersection.spaces.length !== 4 || new Set(intersection.spaces).size !== 4) {
            problems.push(`${name} must touch exactly four different spaces`)
            continue
        }
        const unknown = intersection.spaces.filter((space) => !spaceSet.has(space))
        if (unknown.length > 0) {
            problems.push(`${name} uses unknown spaces ${unknown.join(', ')}`)
            continue
        }
        const rowIndexes = intersection.spaces.map((space) => data.rows.indexOf(space[0]))
        const columnIndexes = intersection.spaces.map((space) =>
            data.columns.indexOf(Number(space.slice(1)))
        )
        const [rowLow, rowHigh] = [Math.min(...rowIndexes), Math.max(...rowIndexes)]
        const [columnLow, columnHigh] = [Math.min(...columnIndexes), Math.max(...columnIndexes)]
        if (rowHigh - rowLow !== 1 || columnHigh - columnLow !== 1) {
            problems.push(`${name} must touch a 2 by 2 block of neighbouring spaces`)
            continue
        }
        const block = `${rowLow},${columnLow}`
        if (blocks.has(block)) problems.push(`${name} repeats another intersection's block`)
        blocks.add(block)
        for (const space of intersection.spaces) touching.set(space, (touching.get(space) ?? 0) + 1)
    }

    const derivedOutside = spaces.filter((space) => (touching.get(space) ?? 0) < 4).sort()
    const listedOutside = [...data.outsideSpaces].sort()
    if (listedOutside.length !== OUTSIDE_SPACE_COUNT) {
        problems.push(
            `Expected ${OUTSIDE_SPACE_COUNT} outside spaces but found ${listedOutside.length}`
        )
    }
    if (derivedOutside.join() !== listedOutside.join()) {
        problems.push(
            'The outside spaces are not the spaces that touch fewer than four intersections'
        )
    }

    let seaTotal = 0
    for (const space of spaces) {
        const copies = data.seaCardCopies[space]
        const expected = listedOutside.includes(space) ? 1 : 2
        if (copies !== expected) {
            problems.push(`Space ${space} has ${copies} sea cards, expected ${expected}`)
        }
        seaTotal += copies ?? 0
    }
    for (const key of Object.keys(data.seaCardCopies)) {
        if (!spaceSet.has(key)) problems.push(`Sea cards name an unknown space ${key}`)
    }
    if (seaTotal !== SEA_CARD_TOTAL) {
        problems.push(`Expected ${SEA_CARD_TOTAL} sea cards but the list has ${seaTotal}`)
    }

    const expectedDutchman = [
        ...data.rows.map((row) => `row:${row}`),
        ...data.columns.map((column) => `col:${column}`)
    ].sort()
    if (data.dutchmanCards.length !== DUTCHMAN_CARD_TOTAL) {
        problems.push(
            `Expected ${DUTCHMAN_CARD_TOTAL} Flying Dutchman cards but found ${data.dutchmanCards.length}`
        )
    }
    if ([...data.dutchmanCards].sort().join() !== expectedDutchman.join()) {
        problems.push('The Flying Dutchman cards must be one for each row and one for each column')
    }
    return problems
}

export class Board {
    readonly spaces: string[]
    readonly intersections: Intersection[]
    readonly outsideSpaces: Set<string>
    readonly seaCardCopies: Record<string, number>
    readonly dutchmanCards: string[]
    private readonly byId = new Map<string, Intersection>()
    private readonly around = new Map<string, string[]>()

    constructor(data: BoardData) {
        const problems = checkBoardData(data)
        if (problems.length > 0) {
            throw Error(`The board data is inconsistent:\n- ${problems.join('\n- ')}`)
        }
        this.spaces = data.rows.flatMap((row) => data.columns.map((column) => `${row}${column}`))
        this.intersections = data.intersections
        this.outsideSpaces = new Set(data.outsideSpaces)
        this.seaCardCopies = data.seaCardCopies
        this.dutchmanCards = data.dutchmanCards
        for (const space of this.spaces) this.around.set(space, [])
        for (const intersection of data.intersections) {
            this.byId.set(intersection.id, intersection)
            for (const space of intersection.spaces) this.around.get(space)?.push(intersection.id)
        }
    }

    intersection(id: string): Intersection {
        const intersection = this.byId.get(id)
        if (!intersection) throw Error(`There is no intersection ${id}`)
        return intersection
    }

    isSpace(space: string): boolean {
        return this.around.has(space)
    }

    isOutside(space: string): boolean {
        return this.outsideSpaces.has(space)
    }

    intersectionsAround(space: string): string[] {
        return this.around.get(space) ?? []
    }

    spacesOfLine(card: string): string[] {
        const [kind, key] = card.split(':')
        return this.spaces.filter((space) =>
            kind === 'row' ? space[0] === key : space.slice(1) === key
        )
    }

    isDutchmanCard(card: string): boolean {
        return this.dutchmanCards.includes(card)
    }
}

export const board = new Board(BOARD_DATA)
