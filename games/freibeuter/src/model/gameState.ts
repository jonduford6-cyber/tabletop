import {
    assert,
    GameResult,
    GameState,
    HydratableGameState,
    HydratedTurnManager,
    PrngState,
    type RandomState,
    Visibility
} from '@tabletop/common'
import * as Type from 'typebox'
import { Compile } from 'typebox/compile'
import { board } from '../components/board.js'
import { CardPile, HydratedCardPile } from '../components/cardPile.js'
import { Card } from '../components/cards.js'
import { MachineState } from '../definition/states.js'
import {
    FreibeuterPlayerState,
    HydratedFreibeuterPlayerState,
    type FreibeuterProjectedPlayerState
} from './playerState.js'

export enum CounterKind {
    Ship = 'ship',
    Chest = 'chest',
    Doubling = 'doubling'
}

export enum TurnAction {
    Capture = 'capture',
    Sea = 'sea',
    Dutchman = 'dutchman'
}

export enum EndReason {
    LastChest = 'lastChest',
    DrawPilesEmpty = 'drawPilesEmpty',
    NoBoats = 'noBoats',
    AllPassed = 'allPassed'
}

export enum Pile {
    Sea = 'sea',
    Dutchman = 'dutchman'
}

export type Counter = Type.Static<typeof Counter>
export const Counter = Type.Object({
    intersection: Type.String(),
    kind: Type.Enum(CounterKind),
    value: Type.Optional(Type.Number()),
    captorId: Type.Optional(Type.String())
})

export type PlacedBoat = Type.Static<typeof PlacedBoat>
export const PlacedBoat = Type.Object({
    space: Type.String(),
    playerId: Type.String()
})

export type FreibeuterGameState = Type.Static<typeof FreibeuterGameState>
export const FreibeuterGameState = Type.Evaluate(
    Type.Intersect([
        Type.Omit(GameState, ['players', 'machineState']),
        Type.Object({
            players: Type.Array(FreibeuterPlayerState),
            machineState: Type.Enum(MachineState),
            placedBoats: Type.Array(PlacedBoat),
            counters: Type.Array(Counter),
            removedChests: Type.Number(),
            removedDoublings: Type.Array(Type.Number()),
            seaPile: CardPile,
            dutchmanPile: CardPile,
            seaDiscard: Type.Array(Card),
            dutchmanDiscard: Type.Array(Card),
            dutchmanAt: Type.Optional(Type.String()),
            surrounded: Type.Array(Type.String()),
            turnAction: Type.Optional(Type.Enum(TurnAction)),
            passes: Type.Number(),
            endReason: Type.Optional(Type.Enum(EndReason))
        })
    ])
)

export const FreibeuterGameStateValidator = Compile(FreibeuterGameState)
export const FreibeuterProjectedState = Visibility.createProjectionSchema(FreibeuterGameState)
export type FreibeuterProjectedState = Type.Static<typeof FreibeuterProjectedState>
const FreibeuterProjectedStateValidator = Compile(FreibeuterProjectedState)

export class HydratedFreibeuterGameState
    extends HydratableGameState<typeof FreibeuterProjectedState, HydratedFreibeuterPlayerState>
    implements FreibeuterProjectedState
{
    declare id: string
    declare gameId: string
    declare prng: PrngState
    declare protectedPrng?: RandomState
    declare activePlayerIds: string[]
    declare actionCount: number
    declare actionChecksum: number
    declare players: HydratedFreibeuterPlayerState[]
    declare turnManager: HydratedTurnManager
    declare machineState: MachineState
    declare result?: GameResult
    declare winningPlayerIds: string[]
    declare placedBoats: PlacedBoat[]
    declare counters: Counter[]
    declare removedChests: number
    declare removedDoublings: number[]
    declare seaPile: HydratedCardPile
    declare dutchmanPile: HydratedCardPile
    declare seaDiscard: Card[]
    declare dutchmanDiscard: Card[]
    declare dutchmanAt?: string
    declare surrounded: string[]
    declare turnAction?: TurnAction
    declare passes: number
    declare endReason?: EndReason

    constructor(data: FreibeuterProjectedState) {
        super(data, FreibeuterProjectedStateValidator)
        this.players = data.players.map(
            (player: FreibeuterProjectedPlayerState) => new HydratedFreibeuterPlayerState(player)
        )
        this.seaPile = new HydratedCardPile(data.seaPile)
        this.dutchmanPile = new HydratedCardPile(data.dutchmanPile)
    }

    turnPlayerId(): string {
        const turn = this.turnManager.currentTurn()
        assert(turn !== undefined, 'There is no current turn')
        return turn.playerId
    }

    boatsOn(space: string): PlacedBoat[] {
        return this.placedBoats.filter((boat) => boat.space === space)
    }

    hasBoat(space: string): boolean {
        return this.placedBoats.some((boat) => boat.space === space)
    }

    counterAt(intersection: string): Counter | undefined {
        return this.counters.find((counter) => counter.intersection === intersection)
    }

    uncapturedShips(): Counter[] {
        return this.counters.filter(
            (counter) => counter.kind === CounterKind.Ship && counter.captorId === undefined
        )
    }

    findSurrounded(): string[] {
        return this.counters
            .filter((counter) =>
                board
                    .intersection(counter.intersection)
                    .spaces.every((space) => this.hasBoat(space) || this.dutchmanAt === space)
            )
            .map((counter) => counter.intersection)
    }

    drawChoices(playerId: string): Pile[] {
        const seaAvailable = this.seaPile.remaining > 0
        const dutchmanAvailable = this.dutchmanPile.remaining > 0
        if (this.getPlayerState(playerId).seaCount === 0 && seaAvailable) return [Pile.Sea]
        return [...(seaAvailable ? [Pile.Sea] : []), ...(dutchmanAvailable ? [Pile.Dutchman] : [])]
    }

    clockwiseFrom(playerId: string): string[] {
        const order = this.turnManager.turnOrder
        const start = order.indexOf(playerId)
        return [...order.slice(start), ...order.slice(0, start)]
    }
}
