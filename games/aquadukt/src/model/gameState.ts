import {
    GameResult,
    GameState,
    HydratableGameState,
    HydratedTurnManager,
    OffsetCoordinates,
    PrngState,
    type RandomState
} from '@tabletop/common'
import * as Type from 'typebox'
import { Compile } from 'typebox/compile'
import { AquaduktPlayerState, HydratedAquaduktPlayerState } from './playerState.js'
import { MachineState } from '../definition/states.js'
import { Board } from '../components/board.js'
import {
    Canal,
    canalsRemaining,
    legalCanalEdges,
    springPlacementProblem,
    springsRemaining
} from '../components/canals.js'
import { allIntersections, squareKey } from '../components/geometry.js'
import { suppliedSquareKeys } from '../components/supply.js'

export type House = Type.Static<typeof House>
export const House = Type.Object({
    row: Type.Number(),
    col: Type.Number(),
    playerId: Type.String(),
    value: Type.Number()
})

export type AquaduktGameState = Type.Static<typeof AquaduktGameState>
export const AquaduktGameState = Type.Evaluate(
    Type.Intersect([
        Type.Omit(GameState, ['players', 'machineState']),
        Type.Object({
            players: Type.Array(AquaduktPlayerState),
            machineState: Type.Enum(MachineState),
            mountains: Type.Array(OffsetCoordinates),
            houses: Type.Array(House),
            springs: Type.Array(OffsetCoordinates),
            canals: Type.Array(Canal),
            rolledRegion: Type.Optional(Type.Number()),
            housesPlacedThisTurn: Type.Number(),
            canalsPlacedThisTurn: Type.Number(),
            consecutivePasses: Type.Number(),
            finalRound: Type.Boolean()
        })
    ])
)

export const AquaduktGameStateValidator = Compile(AquaduktGameState)

export class HydratedAquaduktGameState
    extends HydratableGameState<typeof AquaduktGameState, HydratedAquaduktPlayerState>
    implements AquaduktGameState
{
    declare id: string
    declare gameId: string
    declare prng: PrngState
    declare protectedPrng?: RandomState
    declare activePlayerIds: string[]
    declare actionCount: number
    declare actionChecksum: number
    declare players: HydratedAquaduktPlayerState[]
    declare turnManager: HydratedTurnManager
    declare machineState: MachineState
    declare result?: GameResult
    declare winningPlayerIds: string[]
    declare mountains: OffsetCoordinates[]
    declare houses: House[]
    declare springs: OffsetCoordinates[]
    declare canals: Canal[]
    declare rolledRegion?: number
    declare housesPlacedThisTurn: number
    declare canalsPlacedThisTurn: number
    declare consecutivePasses: number
    declare finalRound: boolean

    constructor(data: AquaduktGameState) {
        super(data, AquaduktGameStateValidator)
        this.players = data.players.map((player) => new HydratedAquaduktPlayerState(player))
    }

    get canalsRemaining(): number {
        return canalsRemaining(this.canals)
    }

    get springsRemaining(): number {
        return springsRemaining(this.springs)
    }

    houseAt(square: OffsetCoordinates): House | undefined {
        return this.houses.find((house) => house.row === square.row && house.col === square.col)
    }

    isMountain(square: OffsetCoordinates): boolean {
        return this.mountains.some(
            (mountain) => mountain.row === square.row && mountain.col === square.col
        )
    }

    isFreeSquare(square: OffsetCoordinates): boolean {
        return Board.isPlayable(square) && !this.isMountain(square) && !this.houseAt(square)
    }

    freeSquaresInRegion(region: number): OffsetCoordinates[] {
        return Board.squaresInRegion(region).filter((square) => this.isFreeSquare(square))
    }

    isRegionFull(region: number): boolean {
        return this.freeSquaresInRegion(region).length === 0
    }

    hasRegionWithFreeSquare(): boolean {
        return Board.playableSquares.some((square) => this.isFreeSquare(square))
    }

    isSupplied(square: OffsetCoordinates): boolean {
        return suppliedSquareKeys(this.canals).has(squareKey(square))
    }

    suppliedHouses(): House[] {
        const supplied = suppliedSquareKeys(this.canals)
        return this.houses.filter((house) => supplied.has(squareKey(house)))
    }

    removeUnsuppliedHouses(region?: number): House[] {
        const supplied = suppliedSquareKeys(this.canals)
        const removed = this.houses.filter(
            (house) =>
                !supplied.has(squareKey(house)) &&
                (region === undefined || Board.regionOf(house) === region)
        )
        this.houses = this.houses.filter((house) => !removed.includes(house))
        return removed
    }

    canDiscoverSpring(): boolean {
        return allIntersections().some((point) => springPlacementProblem(this, point) === undefined)
    }

    canBuildCanals(): boolean {
        return legalCanalEdges(this).length > 0
    }

    isLastInTurnOrder(playerId: string): boolean {
        return this.turnManager.turnOrder[this.turnManager.turnOrder.length - 1] === playerId
    }

    resetTurnProgress() {
        this.rolledRegion = undefined
        this.housesPlacedThisTurn = 0
        this.canalsPlacedThisTurn = 0
    }
}
