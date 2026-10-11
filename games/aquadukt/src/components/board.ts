import { assert, type OffsetCoordinates } from '@tabletop/common'
import { REGION_MAP } from '../definition/regionMap.js'
import { NUM_REGIONS } from '../definition/setup.js'
import { NUM_COLS, NUM_ROWS, isSquareOnBoard, squareKey } from './geometry.js'

const UNPLAYABLE = 'XX'

export class AquaduktBoard {
    private readonly regionBySquare = new Map<string, number>()
    private readonly squaresByRegion = new Map<number, OffsetCoordinates[]>()
    readonly playableSquares: OffsetCoordinates[] = []

    constructor(rows: readonly string[]) {
        assert(rows.length === NUM_ROWS, `Region map must have ${NUM_ROWS} rows`)
        rows.forEach((line, rowIndex) => {
            const cells = line.trim().split(/\s+/)
            assert(
                cells.length === NUM_COLS,
                `Region map row ${rowIndex + 1} must have ${NUM_COLS} cells`
            )
            cells.forEach((cell, colIndex) => {
                if (cell !== UNPLAYABLE) {
                    this.addSquare({ row: rowIndex + 1, col: colIndex + 1 }, Number(cell))
                }
            })
        })
        assert(
            this.squaresByRegion.size === NUM_REGIONS,
            `Region map must define regions 1 to ${NUM_REGIONS}`
        )
    }

    private addSquare(square: OffsetCoordinates, region: number) {
        assert(
            Number.isInteger(region) && region >= 1 && region <= NUM_REGIONS,
            `Invalid region ${region} in region map`
        )
        this.regionBySquare.set(squareKey(square), region)
        const squares = this.squaresByRegion.get(region) ?? []
        squares.push(square)
        this.squaresByRegion.set(region, squares)
        this.playableSquares.push(square)
    }

    isPlayable(square: OffsetCoordinates): boolean {
        return isSquareOnBoard(square) && this.regionBySquare.has(squareKey(square))
    }

    regionOf(square: OffsetCoordinates): number {
        const region = this.regionBySquare.get(squareKey(square))
        assert(region !== undefined, `Square ${squareKey(square)} is not playable`)
        return region
    }

    squaresInRegion(region: number): OffsetCoordinates[] {
        return this.squaresByRegion.get(region) ?? []
    }

    regionSize(region: number): number {
        return this.squaresInRegion(region).length
    }
}

export const Board = new AquaduktBoard(REGION_MAP)
