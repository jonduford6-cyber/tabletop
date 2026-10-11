import { Color, Hydratable, PlayerState } from '@tabletop/common'
import * as Type from 'typebox'
import { Compile } from 'typebox/compile'
import { TILE_VALUES } from '../definition/setup.js'

export type AquaduktPlayerState = Type.Static<typeof AquaduktPlayerState>
export const AquaduktPlayerState = Type.Evaluate(
    Type.Intersect([
        PlayerState,
        Type.Object({
            tiles: Type.Array(Type.Number())
        })
    ])
)

export const AquaduktPlayerStateValidator = Compile(AquaduktPlayerState)

export class HydratedAquaduktPlayerState
    extends Hydratable<typeof AquaduktPlayerState>
    implements AquaduktPlayerState
{
    declare playerId: string
    declare color: Color
    declare tiles: number[]

    constructor(data: AquaduktPlayerState) {
        super(data, AquaduktPlayerStateValidator)
    }

    tilesLeft(value: number): number {
        return this.tiles[value - 1] ?? 0
    }

    totalTilesLeft(): number {
        return this.tiles.reduce((total, count) => total + count, 0)
    }

    lowestTileValue(): number | undefined {
        return TILE_VALUES.find((value) => this.tilesLeft(value) > 0)
    }

    takeTile(value: number) {
        if (this.tilesLeft(value) <= 0) {
            throw Error(`Player has no ${value}-house tile left`)
        }
        this.tiles[value - 1] -= 1
    }
}
