import * as Type from 'typebox'
import { Compile } from 'typebox/compile'
import { GameAction, HydratableAction, assert, type MachineContext } from '@tabletop/common'
import { ActionType } from '../definition/actions.js'
import { Board } from '../components/board.js'
import { House, type HydratedAquaduktGameState } from '../model/gameState.js'

export type PlaceHouseMetadata = Type.Static<typeof PlaceHouseMetadata>
export const PlaceHouseMetadata = Type.Object({
    region: Type.Number(),
    removedHouses: Type.Array(House)
})

export type PlaceHouse = Type.Static<typeof PlaceHouse>
export const PlaceHouse = Type.Evaluate(
    Type.Intersect([
        Type.Omit(GameAction, ['playerId']),
        Type.Object({
            type: Type.Literal(ActionType.PlaceHouse),
            playerId: Type.String(),
            row: Type.Number(),
            col: Type.Number(),
            value: Type.Number(),
            metadata: Type.Optional(PlaceHouseMetadata)
        })
    ])
)

export const PlaceHouseValidator = Compile(PlaceHouse)

export function isPlaceHouse(action?: GameAction): action is PlaceHouse {
    return action?.type === ActionType.PlaceHouse
}

export class HydratedPlaceHouse extends HydratableAction<typeof PlaceHouse> implements PlaceHouse {
    declare type: ActionType.PlaceHouse
    declare playerId: string
    declare row: number
    declare col: number
    declare value: number
    declare metadata?: PlaceHouseMetadata

    constructor(data: PlaceHouse) {
        super(data, PlaceHouseValidator)
    }

    apply(state: HydratedAquaduktGameState, _context?: MachineContext) {
        const problem = this.placementProblem(state)
        assert(problem === undefined, problem ?? '')

        const region = Board.regionOf(this)
        state.getPlayerState(this.playerId).takeTile(this.value)
        state.houses.push({
            row: this.row,
            col: this.col,
            playerId: this.playerId,
            value: this.value
        })
        state.housesPlacedThisTurn += 1
        state.rolledRegion = undefined

        const removedHouses = state.isRegionFull(region) ? state.removeUnsuppliedHouses(region) : []
        this.metadata = { region, removedHouses }
    }

    private placementProblem(state: HydratedAquaduktGameState): string | undefined {
        if (state.rolledRegion === undefined) return 'The die has not been rolled'
        if (!Board.isPlayable(this)) return 'Square is not on the board'
        if (Board.regionOf(this) !== state.rolledRegion) return 'Square is not in the rolled region'
        if (!state.isFreeSquare(this)) return 'Square is not free'
        const player = state.getPlayerState(this.playerId)
        if (player.tilesLeft(this.value) <= 0) return 'The player has no such house tile left'
        if (state.isSupplied(this) && this.value !== player.lowestTileValue()) {
            return 'A supplied square needs one of the lowest-value remaining tiles'
        }
        return undefined
    }
}
