import { assert, Color, Hydratable, PlayerState, Visibility } from '@tabletop/common'
import * as Type from 'typebox'
import { Compile } from 'typebox/compile'

export type Druid = Type.Static<typeof Druid>
export const Druid = Type.Object({
    row: Type.Number(),
    col: Type.Number(),
    belly: Type.Boolean()
})

export type DolmengotterPlayerState = Type.Static<typeof DolmengotterPlayerState>
export const DolmengotterPlayerState = Type.Evaluate(
    Type.Intersect([
        PlayerState,
        Type.Object({
            stones: Type.Number(),
            dolmenCount: Type.Number(),
            dolmens: Visibility.protect(Type.Array(Type.Number()), {
                policy: Visibility.Policy.Owner,
                redaction: Visibility.redaction.emptyArray()
            }),
            dolmensPlaced: Type.Number(),
            scoredValues: Type.Array(Type.Number()),
            points: Type.Number(),
            druids: Type.Array(Druid)
        })
    ])
)

export const DolmengotterPlayerStateValidator = Compile(DolmengotterPlayerState)

export const DolmengotterProjectedPlayerState =
    Visibility.createProjectionSchema(DolmengotterPlayerState)
export type DolmengotterProjectedPlayerState = Type.Static<typeof DolmengotterProjectedPlayerState>
const DolmengotterProjectedPlayerStateValidator = Compile(DolmengotterProjectedPlayerState)

export class HydratedDolmengotterPlayerState
    extends Hydratable<typeof DolmengotterProjectedPlayerState>
    implements DolmengotterProjectedPlayerState
{
    declare playerId: string
    declare color: Color
    declare stones: number
    declare dolmenCount: number
    declare dolmens: number[]
    declare dolmensPlaced: number
    declare scoredValues: number[]
    declare points: number
    declare druids: Druid[]

    constructor(data: DolmengotterProjectedPlayerState) {
        super(data, DolmengotterProjectedPlayerStateValidator)
    }

    druidAt(row: number, col: number): Druid | undefined {
        return this.druids.find((druid) => druid.row === row && druid.col === col)
    }

    hasDolmenValue(value: number): boolean {
        return this.dolmens.includes(value)
    }

    takeDolmen(value: number) {
        const index = this.dolmens.indexOf(value)
        assert(index >= 0, 'The player has no dolmen with that value')
        this.dolmens.splice(index, 1)
        this.dolmenCount -= 1
        this.dolmensPlaced += 1
    }
}
