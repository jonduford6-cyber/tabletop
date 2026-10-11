import * as Type from 'typebox'
import { Compile } from 'typebox/compile'
import { GameAction, HydratableAction, assert, type MachineContext } from '@tabletop/common'
import { ActionType } from '../definition/actions.js'
import { board } from '../components/board.js'
import { dolmenEventForStone } from '../util/dolmenEvents.js'
import type { HydratedDolmengotterGameState, PendingDolmen } from '../model/gameState.js'

export type PlaceStoneMetadata = Type.Static<typeof PlaceStoneMetadata>
export const PlaceStoneMetadata = Type.Object({
    row: Type.Number(),
    col: Type.Number(),
    dolmenRights: Type.Array(
        Type.Object({
            circleId: Type.Number(),
            playerId: Type.String(),
            kind: Type.Union([Type.Literal('majority'), Type.Literal('equalizer')])
        })
    ),
    completedCircles: Type.Array(Type.Number())
})

export type PlaceStone = Type.Static<typeof PlaceStone>
export const PlaceStone = Type.Evaluate(
    Type.Intersect([
        Type.Omit(GameAction, ['playerId']),
        Type.Object({
            type: Type.Literal(ActionType.PlaceStone),
            playerId: Type.String(),
            metadata: Type.Optional(PlaceStoneMetadata)
        })
    ])
)

export const PlaceStoneValidator = Compile(PlaceStone)

export function isPlaceStone(action?: GameAction): action is PlaceStone {
    return action?.type === ActionType.PlaceStone
}

export class HydratedPlaceStone extends HydratableAction<typeof PlaceStone> implements PlaceStone {
    declare type: ActionType.PlaceStone
    declare playerId: string
    declare metadata?: PlaceStoneMetadata

    constructor(data: PlaceStone) {
        super(data, PlaceStoneValidator)
    }

    apply(state: HydratedDolmengotterGameState, _context?: MachineContext) {
        const place = state.vacatedPlace
        assert(place !== undefined, 'There is no stone place waiting for a stone')
        const player = state.getPlayerState(this.playerId)
        assert(player.stones > 0, 'The player has no stones left')

        const rights: PendingDolmen[] = []
        const completedCircles: number[] = []
        for (const circleId of board.circlesAt(place)) {
            const circle = state.circles[circleId]
            const event = dolmenEventForStone({
                before: state.stoneCounts(circleId),
                placedBy: this.playerId,
                hadMajority: circle.hadMajority
            })
            if (event) rights.push({ ...event, circleId })
        }

        player.stones -= 1
        state.stones.push({ row: place.row, col: place.col, playerId: this.playerId })
        state.vacatedPlace = undefined

        for (const circleId of board.circlesAt(place)) {
            if (state.majorityHolder(circleId) !== undefined)
                state.circles[circleId].hadMajority = true
            if (state.isCircleComplete(circleId)) completedCircles.push(circleId)
        }
        state.circlesToScore = completedCircles
        state.pendingDolmens = state.orderPendingDolmens(rights)
        this.metadata = {
            row: place.row,
            col: place.col,
            dolmenRights: rights,
            completedCircles
        }
    }
}
