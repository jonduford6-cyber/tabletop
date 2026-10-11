import { board, placeKey, type Circle } from '@tabletop/dolmengotter'
import type { OffsetCoordinates } from '@tabletop/common'

const S = 1 / Math.SQRT2

const COLUMN_OFFSETS: readonly [number, number][] = [
    [0, 0],
    [1, 0],
    [1, 1],
    [2, 1],
    [3, 1],
    [4, 1],
    [4, 2],
    [5, 2],
    [5, 3],
    [6, 3],
    [7, 3],
    [8, 3],
    [8, 4],
    [9, 4],
    [9, 5],
    [10, 5]
]

const ROW_OFFSETS: readonly [number, number][] = [
    [0, 0],
    [1, 0],
    [1, 1],
    [2, 1],
    [2, 2],
    [3, 2],
    [3, 3],
    [4, 3],
    [4, 4],
    [5, 4]
]

export const UNIT = 74
export const MARGIN = 62

export function idealX(col: number): number {
    const [multiples, whole] = COLUMN_OFFSETS[col]
    return multiples * S + whole
}

export function idealY(row: number): number {
    const [multiples, whole] = ROW_OFFSETS[row]
    return multiples * S + whole
}

export const BOARD_WIDTH = idealX(15) * UNIT + 2 * MARGIN
export const BOARD_HEIGHT = idealY(9) * UNIT + 2 * MARGIN

export type Point = { x: number; y: number }

export function placePoint(place: OffsetCoordinates): Point {
    return { x: MARGIN + idealX(place.col) * UNIT, y: MARGIN + idealY(place.row) * UNIT }
}

export function circleCenter(circle: Circle): Point {
    const points = circle.places.map(placePoint)
    return {
        x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
        y: points.reduce((sum, point) => sum + point.y, 0) / points.length
    }
}

export function circlePolygon(circle: Circle): string {
    return circle.places
        .map((place) => {
            const { x, y } = placePoint(place)
            return `${x},${y}`
        })
        .join(' ')
}

export type Line = { key: string; from: Point; to: Point }

export function drawnLines(): Line[] {
    const seen = new Set<string>()
    const lines: Line[] = []
    for (const circle of board.circles) {
        circle.places.forEach((place, index) => {
            const next = circle.places[(index + 1) % circle.places.length]
            const key = [placeKey(place), placeKey(next)].sort().join('|')
            if (seen.has(key)) return
            seen.add(key)
            lines.push({ key, from: placePoint(place), to: placePoint(next) })
        })
    }
    return lines
}

const RUNE_LETTERS = 'ABCDEFGHIJKLMNOPQRST'
export const CORNER_RUNE = '★'

export type Rune = { place: OffsetCoordinates; symbol: string; x: number; y: number }

function lineNeighbourKeys(): Set<string> {
    const keys = new Set<string>()
    for (const line of drawnLines()) {
        const [a, b] = line.key.split('|')
        keys.add(`${a}|${b}`)
        keys.add(`${b}|${a}`)
    }
    return keys
}

export function runeLinks(): Map<string, string[]> {
    const lineKeys = lineNeighbourKeys()
    const links = new Map<string, string[]>()
    for (const place of board.places) {
        if (!board.isBorder(place)) continue
        const key = placeKey(place)
        links.set(
            key,
            board
                .neighbours(place)
                .map(placeKey)
                .filter((other) => !lineKeys.has(`${key}|${other}`))
        )
    }
    return links
}

export function runes(): Rune[] {
    const links = runeLinks()
    const symbolByPair = new Map<string, string>()
    let next = 0
    const symbolFor = (key: string): string => {
        const partners = links.get(key) ?? []
        if (partners.length > 1) return CORNER_RUNE
        const pair = [key, ...partners].sort().join('|')
        let symbol = symbolByPair.get(pair)
        if (symbol === undefined) {
            symbol = RUNE_LETTERS[next % RUNE_LETTERS.length]
            next += 1
            symbolByPair.set(pair, symbol)
        }
        return symbol
    }

    return board.places
        .filter((place) => board.isBorder(place))
        .map((place) => {
            const point = placePoint(place)
            const centers = board.circlesAt(place).map((id) => circleCenter(board.circle(id)))
            const around = {
                x: centers.reduce((sum, c) => sum + c.x, 0) / centers.length,
                y: centers.reduce((sum, c) => sum + c.y, 0) / centers.length
            }
            const dx = point.x - around.x
            const dy = point.y - around.y
            const length = Math.hypot(dx, dy) || 1
            const reach = 0.42 * UNIT
            return {
                place,
                symbol: symbolFor(placeKey(place)),
                x: point.x + (dx / length) * reach,
                y: point.y + (dy / length) * reach
            }
        })
}

export type StackLayout = { x: number; y: number; width: number; height: number }

const DOLMEN_WIDTH = 0.62 * UNIT
const DOLMEN_HEIGHT = 0.2 * UNIT

export function numberPosition(circle: Circle): Point {
    const center = circleCenter(circle)
    const half = circle.shape === 'tetragonal' ? 0.5 : 1.2
    const lift = circle.shape === 'tetragonal' ? 0.3 : 0.72
    return { x: center.x, y: center.y - Math.min(lift, half) * UNIT }
}

export function stackLayout(circle: Circle, height: number): StackLayout[] {
    const center = circleCenter(circle)
    const bottom = center.y + (circle.shape === 'tetragonal' ? 0.42 : 0.84) * UNIT
    return Array.from({ length: height }, (_, indexFromBottom) => ({
        x: center.x - DOLMEN_WIDTH / 2,
        y: bottom - (indexFromBottom + 1) * DOLMEN_HEIGHT,
        width: DOLMEN_WIDTH,
        height: DOLMEN_HEIGHT
    }))
}
