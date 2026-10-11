import {
    GameEngine,
    type ActionCascadeResult,
    PlayerStatus,
    createAction,
    getPrng,
    range,
    type Game,
    type GameAction,
    type OffsetCoordinates
} from '@tabletop/common'
import { CollectHerbs } from '../actions/collectHerbs.js'
import { DeclineDolmen } from '../actions/declineDolmen.js'
import { DeclineStone } from '../actions/declineStone.js'
import { Flight } from '../actions/flight.js'
import { PlaceDolmen } from '../actions/placeDolmen.js'
import { PlaceDruid } from '../actions/placeDruid.js'
import { PlaceStone } from '../actions/placeStone.js'
import { Walk } from '../actions/walk.js'
import { board } from '../components/board.js'
import { ActionType } from '../definition/actions.js'
import { Definition } from '../definition/gameDefinition.js'
import { SETUP_BY_PLAYER_COUNT } from '../definition/setup.js'
import { MachineState } from '../definition/states.js'
import {
    DolmengotterGameStateValidator,
    HydratedDolmengotterGameState,
    type BatchDolmen,
    type DolmengotterGameState,
    type DolmengotterProjectedState
} from '../model/gameState.js'
import type { Druid } from '../model/playerState.js'
import { flightDestinations, isFreePlace, walkDestinations } from './moves.js'

export const TEST_MASTER_SEED = '0123456789abcdef0123456789abcdef'

export type TestGame = {
    engine: GameEngine<DolmengotterProjectedState, HydratedDolmengotterGameState>
    game: Game
    state: DolmengotterProjectedState
    processed: GameAction[]
    result?: ActionCascadeResult<DolmengotterProjectedState>
}

export type Spot = readonly [number, number]

export function newTestGame(numPlayers = 4, masterSeed = TEST_MASTER_SEED): TestGame {
    const players = range(1, numPlayers).map((playerNum) => ({
        id: `p${playerNum}`,
        name: `P${playerNum}`,
        isHuman: false,
        status: PlayerStatus.Joined
    }))
    const engine = new GameEngine(Definition.runtime)
    const game = Definition.runtime.initializer.initializeGame(
        { id: 'test-game', typeId: 'dolmengotter', name: 'Test Game', players, ownerId: 'test' },
        Definition
    )
    const { startedGame, initialState } = engine.startGame(game, masterSeed)
    return { engine, game: startedGame, state: initialState, processed: [] }
}

export function canonicalState(test: TestGame): DolmengotterGameState {
    const state = test.state
    if (!DolmengotterGameStateValidator.Check(state)) throw Error('The test state is not canonical')
    return state
}

export function hydrate(test: TestGame): HydratedDolmengotterGameState {
    return new HydratedDolmengotterGameState(test.state)
}

export function activePlayerId(state: DolmengotterProjectedState): string {
    const [playerId] = state.activePlayerIds
    return playerId
}

export function validActionTypes(test: TestGame, playerId = activePlayerId(test.state)): string[] {
    return test.engine.getValidActionTypesForPlayer(test.game, test.state, playerId)
}

export function execute(test: TestGame, action: GameAction): TestGame {
    const result = test.engine.executeAction({ action, state: test.state, game: test.game })
    return { ...test, state: result.updatedState, processed: result.processedActions, result }
}

function base(test: TestGame, playerId = activePlayerId(test.state)) {
    return { gameId: test.state.gameId, playerId }
}

export function placeDruid(test: TestGame, [row, col]: Spot): TestGame {
    return execute(test, createAction(PlaceDruid, { ...base(test), row, col }))
}

export function walk(test: TestGame, [fromRow, fromCol]: Spot, [toRow, toCol]: Spot): TestGame {
    return execute(test, createAction(Walk, { ...base(test), fromRow, fromCol, toRow, toCol }))
}

export function flight(test: TestGame, [fromRow, fromCol]: Spot, [toRow, toCol]: Spot): TestGame {
    return execute(test, createAction(Flight, { ...base(test), fromRow, fromCol, toRow, toCol }))
}

export function collectHerbs(test: TestGame, [row, col]: Spot): TestGame {
    return execute(test, createAction(CollectHerbs, { ...base(test), row, col }))
}

export function placeStone(test: TestGame): TestGame {
    return execute(test, createAction(PlaceStone, base(test)))
}

export function declineStone(test: TestGame): TestGame {
    return execute(test, createAction(DeclineStone, base(test)))
}

export function placeDolmen(test: TestGame, circleId: number, value: number): TestGame {
    return execute(test, createAction(PlaceDolmen, { ...base(test), circleId, value }))
}

export function declineDolmen(test: TestGame, circleId: number): TestGame {
    return execute(test, createAction(DeclineDolmen, { ...base(test), circleId }))
}

export function spotOf(place: OffsetCoordinates): Spot {
    return [place.row, place.col]
}

export type Scenario = {
    numPlayers?: number
    turn?: string
    turnOrder?: string[]
    druids?: Record<string, { at: Spot; belly?: boolean }[]>
    stones?: { at: Spot; playerId: string }[]
    stoneStock?: Record<string, number>
    points?: Record<string, number>
    dolmens?: Record<string, number[]>
    circles?: Record<number, { hadMajority?: boolean; batch?: BatchDolmen[] }>
    machineState?: MachineState
}

export function scenario(setup: Scenario = {}): TestGame {
    const test = newTestGame(setup.numPlayers ?? 4)
    const state = hydrate(test)
    const ids = state.players.map((player) => player.playerId)
    state.turnManager.turnOrder = setup.turnOrder ?? ids
    state.turnManager.series = []
    state.stones = (setup.stones ?? []).map(({ at, playerId }) => ({
        row: at[0],
        col: at[1],
        playerId
    }))
    for (const player of state.players) {
        const placed = state.stones.filter((stone) => stone.playerId === player.playerId).length
        player.stones =
            setup.stoneStock?.[player.playerId] ?? SETUP_BY_PLAYER_COUNT[ids.length].stones - placed
        player.points = setup.points?.[player.playerId] ?? player.points
        const dolmens = setup.dolmens?.[player.playerId]
        if (dolmens) {
            player.dolmens = [...dolmens]
            player.dolmenCount = dolmens.length
        }
        const druids: Druid[] = (setup.druids?.[player.playerId] ?? []).map(({ at, belly }) => ({
            row: at[0],
            col: at[1],
            belly: belly ?? false
        }))
        player.druids = druids
    }
    for (const [circleId, circle] of Object.entries(setup.circles ?? {})) {
        const target = state.circles[Number(circleId)]
        target.hadMajority = circle.hadMajority ?? target.hadMajority
        target.batch = circle.batch ?? target.batch
    }
    state.machineState = setup.machineState ?? MachineState.StartOfTurn
    if (state.machineState === MachineState.StartOfTurn) {
        const turn = setup.turn ?? ids[0]
        state.turnManager.startTurn(turn, state.actionCount)
        state.activePlayerIds = [turn]
    }
    return { ...test, state: state.dehydrate() }
}

export function giveTurn(test: TestGame, playerId: string): TestGame {
    const state = hydrate(test)
    if (state.turnManager.currentTurn()) state.turnManager.endTurn(state.actionCount)
    state.turnManager.startTurn(playerId, state.actionCount)
    state.activePlayerIds = [playerId]
    state.machineState = MachineState.StartOfTurn
    return { ...test, state: state.dehydrate() }
}

export function withState(
    test: TestGame,
    change: (state: HydratedDolmengotterGameState) => void
): TestGame {
    const state = hydrate(test)
    change(state)
    return { ...test, state: state.dehydrate() }
}

export function freeFarPlace(test: TestGame): Spot {
    const occupancy = hydrate(test).occupancy
    const place = [...board.places].reverse().find((candidate) => isFreePlace(occupancy, candidate))
    if (!place) throw Error('No free stone place')
    return spotOf(place)
}

export function stoneBy(test: TestGame, playerId: string, at: Spot): TestGame {
    const prepared = withState(giveTurn(test, playerId), (state) => {
        state.getPlayerState(playerId).druids.push({ row: at[0], col: at[1], belly: true })
    })
    return placeStone(flight(prepared, at, freeFarPlace(prepared)))
}

export function decideDolmens(test: TestGame, ...decisions: (number | undefined)[]): TestGame {
    let result = test
    for (const decision of decisions) {
        const [right] = hydrate(result).pendingDolmens
        result =
            decision === undefined
                ? declineDolmen(result, right.circleId)
                : placeDolmen(result, right.circleId, decision)
    }
    return result
}

export type ScriptedGame = {
    final: TestGame
    actions: GameAction[]
    processed: GameAction[]
}

export type BotStyle = { declineStone: number; declineDolmen: number }

export function playBotGame(
    numPlayers: number,
    masterSeed: string,
    botSeed = 1,
    style: BotStyle = { declineStone: 0.2, declineDolmen: 0.2 }
): ScriptedGame {
    const random = getPrng(botSeed)
    const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)]
    let test = newTestGame(numPlayers, masterSeed)
    const actions: GameAction[] = []
    const processed: GameAction[] = []

    const choose = (): GameAction => {
        const state = hydrate(test)
        const playerId = activePlayerId(test.state)
        const player = state.getPlayerState(playerId)
        const common = base(test, playerId)
        switch (test.state.machineState) {
            case MachineState.PlacingDruids: {
                const free = board.places.filter((place) => isFreePlace(state.occupancy, place))
                return createAction(PlaceDruid, { ...common, ...pick(free) })
            }
            case MachineState.StoneDecision: {
                const mayDecline = validActionTypes(test).includes(ActionType.DeclineStone)
                return mayDecline && random() < style.declineStone
                    ? createAction(DeclineStone, common)
                    : createAction(PlaceStone, common)
            }
            case MachineState.DolmenDecision: {
                const [right] = state.pendingDolmens
                const circleId = right.circleId
                return random() >= style.declineDolmen
                    ? createAction(PlaceDolmen, {
                          ...common,
                          circleId,
                          value: pick(player.dolmens)
                      })
                    : createAction(DeclineDolmen, { ...common, circleId })
            }
            default: {
                const types = weightedTypes(validActionTypes(test))
                const type = pick(types)
                const upright = player.druids.filter((druid) => !druid.belly)
                const belly = player.druids.filter((druid) => druid.belly)
                if (type === ActionType.CollectHerbs) {
                    const druid = pick(upright)
                    return createAction(CollectHerbs, { ...common, row: druid.row, col: druid.col })
                }
                if (type === ActionType.Walk) {
                    const movable = upright.filter(
                        (druid) => walkDestinations(state.occupancy, druid).length > 0
                    )
                    const druid = pick(movable)
                    const to = pick(walkDestinations(state.occupancy, druid))
                    return createAction(Walk, {
                        ...common,
                        fromRow: druid.row,
                        fromCol: druid.col,
                        toRow: to.row,
                        toCol: to.col
                    })
                }
                const druid = pick(belly)
                const to = pick(flightDestinations(state.occupancy, druid))
                return createAction(Flight, {
                    ...common,
                    fromRow: druid.row,
                    fromCol: druid.col,
                    toRow: to.row,
                    toCol: to.col
                })
            }
        }
    }

    for (let step = 0; step < 20000 && test.state.machineState !== MachineState.EndOfGame; step++) {
        const action = choose()
        actions.push(action)
        test = execute(test, action)
        processed.push(...test.processed)
    }
    return { final: test, actions, processed }
}

function weightedTypes(valid: string[]): string[] {
    const weights: Record<string, number> = {
        [ActionType.Walk]: 5,
        [ActionType.CollectHerbs]: 2,
        [ActionType.Flight]: 4
    }
    return valid.flatMap((type) => Array<string>(weights[type] ?? 1).fill(type))
}
