import {
    assert,
    GameResult,
    GameState,
    HydratableGameState,
    HydratedTurnManager,
    OffsetCoordinates,
    PrngState,
    type RandomState,
    Visibility
} from '@tabletop/common'
import * as Type from 'typebox'
import { Compile } from 'typebox/compile'
import { board, placeKey } from '../components/board.js'
import { MachineState } from '../definition/states.js'
import {
    DolmengotterPlayerState,
    HydratedDolmengotterPlayerState,
    type DolmengotterProjectedPlayerState
} from './playerState.js'
import { majorityHolder } from '../util/dolmenEvents.js'
import type { Occupancy } from '../util/moves.js'

export type Stone = Type.Static<typeof Stone>
export const Stone = Type.Object({
    row: Type.Number(),
    col: Type.Number(),
    playerId: Type.String()
})

export type BatchDolmen = Type.Static<typeof BatchDolmen>
export const BatchDolmen = Type.Object({
    playerId: Type.String(),
    value: Visibility.protect(Type.Number(), { policy: Visibility.Policy.Owner })
})

export type CircleState = Type.Static<typeof CircleState>
export const CircleState = Type.Object({
    hadMajority: Type.Boolean(),
    batch: Type.Array(BatchDolmen)
})

export type PendingDolmen = Type.Static<typeof PendingDolmen>
export const PendingDolmen = Type.Object({
    playerId: Type.String(),
    circleId: Type.Number(),
    kind: Type.Union([Type.Literal('majority'), Type.Literal('equalizer')])
})

export type DolmengotterGameState = Type.Static<typeof DolmengotterGameState>
export const DolmengotterGameState = Type.Evaluate(
    Type.Intersect([
        Type.Omit(GameState, ['players', 'machineState']),
        Type.Object({
            players: Type.Array(DolmengotterPlayerState),
            machineState: Type.Enum(MachineState),
            stones: Type.Array(Stone),
            circles: Type.Array(CircleState),
            pendingDolmens: Type.Array(PendingDolmen),
            circlesToScore: Type.Array(Type.Number()),
            vacatedPlace: Type.Optional(OffsetCoordinates),
            endTriggeredBy: Type.Optional(Type.String()),
            lastMoves: Type.Optional(Type.Array(Type.String())),
            ending: Type.Boolean()
        })
    ])
)

export const DolmengotterGameStateValidator = Compile(DolmengotterGameState)
export const DolmengotterProjectedState = Visibility.createProjectionSchema(DolmengotterGameState)
export type DolmengotterProjectedState = Type.Static<typeof DolmengotterProjectedState>
const DolmengotterProjectedStateValidator = Compile(DolmengotterProjectedState)

export class HydratedDolmengotterGameState
    extends HydratableGameState<typeof DolmengotterProjectedState, HydratedDolmengotterPlayerState>
    implements DolmengotterProjectedState
{
    declare id: string
    declare gameId: string
    declare prng: PrngState
    declare protectedPrng?: RandomState
    declare activePlayerIds: string[]
    declare actionCount: number
    declare actionChecksum: number
    declare players: HydratedDolmengotterPlayerState[]
    declare turnManager: HydratedTurnManager
    declare machineState: MachineState
    declare result?: GameResult
    declare winningPlayerIds: string[]
    declare stones: Stone[]
    declare circles: DolmengotterProjectedState['circles']
    declare pendingDolmens: PendingDolmen[]
    declare circlesToScore: number[]
    declare vacatedPlace?: OffsetCoordinates
    declare endTriggeredBy?: string
    declare lastMoves?: string[]
    declare ending: boolean

    constructor(data: DolmengotterProjectedState) {
        super(data, DolmengotterProjectedStateValidator)
        this.players = data.players.map(
            (player: DolmengotterProjectedPlayerState) =>
                new HydratedDolmengotterPlayerState(player)
        )
    }

    get occupancy(): Occupancy {
        const stoneKeys = new Set(this.stones.map(placeKey))
        const druidKeys = new Set(this.players.flatMap((player) => player.druids.map(placeKey)))
        return {
            hasStone: (place) => stoneKeys.has(placeKey(place)),
            hasDruid: (place) => druidKeys.has(placeKey(place))
        }
    }

    turnPlayerId(): string {
        const turn = this.turnManager.currentTurn()
        assert(turn !== undefined, 'There is no current turn')
        return turn.playerId
    }

    stoneAt(place: OffsetCoordinates): Stone | undefined {
        return this.stones.find((stone) => stone.row === place.row && stone.col === place.col)
    }

    stoneCounts(circleId: number): Record<string, number> {
        const counts: Record<string, number> = {}
        for (const player of this.players) counts[player.playerId] = 0
        for (const place of board.circle(circleId).places) {
            const stone = this.stoneAt(place)
            if (stone) counts[stone.playerId] += 1
        }
        return counts
    }

    majorityHolder(circleId: number): string | undefined {
        return majorityHolder(this.stoneCounts(circleId))
    }

    isCircleComplete(circleId: number): boolean {
        return board.circle(circleId).places.every((place) => this.stoneAt(place) !== undefined)
    }

    allStonesPlaced(): boolean {
        return this.players.every((player) => player.stones === 0)
    }

    orderPendingDolmens(rights: PendingDolmen[]): PendingDolmen[] {
        const order = this.clockwiseFrom(this.turnPlayerId())
        return rights
            .filter((right) => this.getPlayerState(right.playerId).dolmenCount > 0)
            .sort(
                (a, b) =>
                    order.indexOf(a.playerId) - order.indexOf(b.playerId) || a.circleId - b.circleId
            )
    }

    takePendingDolmen(playerId: string, circleId: number): PendingDolmen {
        const index = this.pendingDolmens.findIndex(
            (right) => right.playerId === playerId && right.circleId === circleId
        )
        assert(index >= 0, 'The player has no dolmen to place or decline in that circle')
        return this.pendingDolmens.splice(index, 1)[0]
    }

    dropDolmenRightsOfPlayersWithoutDolmens() {
        this.pendingDolmens = this.pendingDolmens.filter(
            (right) => this.getPlayerState(right.playerId).dolmenCount > 0
        )
    }

    clockwiseFrom(playerId: string): string[] {
        const order = this.turnManager.turnOrder
        const start = order.indexOf(playerId)
        return [...order.slice(start), ...order.slice(0, start)]
    }
}
