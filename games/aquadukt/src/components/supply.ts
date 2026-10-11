import type { OffsetCoordinates } from '@tabletop/common'
import type { Canal } from './canals.js'
import { adjacentSquares, isSquareOnBoard, squareKey, squaresOneSpaceAway } from './geometry.js'

export function suppliedSquareKeys(canals: readonly Canal[]): Set<string> {
    const supplied = new Set<string>()
    for (const canal of canals) {
        const reached: OffsetCoordinates[] =
            canal.count >= 2
                ? [...adjacentSquares(canal), ...squaresOneSpaceAway(canal)]
                : adjacentSquares(canal)
        for (const square of reached) {
            if (isSquareOnBoard(square)) supplied.add(squareKey(square))
        }
    }
    return supplied
}
