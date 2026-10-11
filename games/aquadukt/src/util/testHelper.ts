import {
    GameEngine,
    PlayerStatus,
    Prng,
    createAction,
    getPrng,
    range,
    type Game,
    type GameAction
} from '@tabletop/common'
import { EndTurn } from '../actions/endTurn.js'
import { PlaceCanal } from '../actions/placeCanal.js'
import { PlaceHouse } from '../actions/placeHouse.js'
import { PlaceSpring } from '../actions/placeSpring.js'
import { RollDie } from '../actions/rollDie.js'
import { Pass } from '../actions/pass.js'
import { ActionType } from '../definition/actions.js'
import { Definition } from '../definition/gameDefinition.js'
import { MachineState } from '../definition/states.js'
import { TILE_VALUES } from '../definition/setup.js'
import { legalCanalEdges, springPlacementProblem } from '../components/canals.js'
import { EdgeOrientation, allIntersections, squareKey } from '../components/geometry.js'
import { suppliedSquareKeys } from '../components/supply.js'
import { AquaduktGameState, HydratedAquaduktGameState } from '../model/gameState.js'

export const TEST_MASTER_SEED = '0123456789abcdef0123456789abcdef'

export type TestGame = {
    engine: GameEngine<AquaduktGameState, HydratedAquaduktGameState>
    game: Game
    state: AquaduktGameState
    processed: GameAction[]
}

export function newTestGame(numPlayers = 4, masterSeed = TEST_MASTER_SEED): TestGame {
    const players = range(1, numPlayers).map((playerNum) => ({
        id: `p${playerNum}`,
        name: `P${playerNum}`,
        isHuman: false,
        status: PlayerStatus.Joined
    }))
    const engine = new GameEngine(Definition.runtime)
    const game = Definition.runtime.initializer.initializeGame(
        { id: 'test-game', typeId: 'aquadukt', name: 'Test Game', players, ownerId: 'test' },
        Definition
    )
    const { startedGame, initialState } = engine.startGame(game, masterSeed)
    return { engine, game: startedGame, state: initialState, processed: [] }
}

export function withState(test: TestGame, changes: Partial<AquaduktGameState>): TestGame {
    return { ...test, state: { ...test.state, ...changes } }
}

export function metadataOf(test: TestGame): unknown {
    return Reflect.get(test.processed[0], 'metadata')
}

export function withTiles(test: TestGame, playerId: string, tiles: number[]): TestGame {
    return withState(test, {
        players: test.state.players.map((player) =>
            player.playerId === playerId ? { ...player, tiles } : player
        )
    })
}

export function hydrate(test: TestGame): HydratedAquaduktGameState {
    return new HydratedAquaduktGameState(test.state)
}

export function activePlayerId(state: AquaduktGameState): string {
    const [playerId] = state.activePlayerIds
    return playerId
}

export function otherPlayerId(state: AquaduktGameState): string {
    const active = activePlayerId(state)
    const other = state.players.find((player) => player.playerId !== active)
    if (!other) throw Error('No other player')
    return other.playerId
}

export function validActionTypes(test: TestGame): string[] {
    return test.engine.getValidActionTypesForPlayer(
        test.game,
        test.state,
        activePlayerId(test.state)
    )
}

export function execute(test: TestGame, action: GameAction): TestGame {
    const result = test.engine.executeAction({ action, state: test.state, game: test.game })
    return { ...test, state: result.updatedState, processed: result.processedActions }
}

function actionBase(test: TestGame) {
    return { gameId: test.state.gameId, playerId: activePlayerId(test.state) }
}

export function rollDie(test: TestGame): TestGame {
    return execute(test, createAction(RollDie, actionBase(test)))
}

export function placeHouse(test: TestGame, row: number, col: number, value: number): TestGame {
    return execute(test, createAction(PlaceHouse, { ...actionBase(test), row, col, value }))
}

export function placeSpring(test: TestGame, row: number, col: number): TestGame {
    return execute(test, createAction(PlaceSpring, { ...actionBase(test), row, col }))
}

export function placeCanal(
    test: TestGame,
    orientation: EdgeOrientation,
    row: number,
    col: number
): TestGame {
    return execute(test, createAction(PlaceCanal, { ...actionBase(test), orientation, row, col }))
}

export function endTurn(test: TestGame): TestGame {
    return execute(test, createAction(EndTurn, actionBase(test)))
}

export function pass(test: TestGame): TestGame {
    return execute(test, createAction(Pass, actionBase(test)))
}

export function prngRolling(...regions: number[]): { seed: number; invocations: number } {
    for (let seed = 1; seed < 2_000_000; seed++) {
        const prng = new Prng({ seed, invocations: 0 })
        if (regions.every((region) => prng.dieRoll(20) === region)) return { seed, invocations: 0 }
    }
    throw Error(`No seed rolls ${regions.join(',')}`)
}

export function rollingRegions(test: TestGame, ...regions: number[]): TestGame {
    return withState(test, { prng: prngRolling(...regions) })
}

export type ScriptedGame = {
    final: TestGame
    actions: GameAction[]
}

export function playScriptedGame(
    numPlayers: number,
    masterSeed: string,
    botSeed = 1
): ScriptedGame {
    const random = getPrng(botSeed)
    const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)]
    let test = newTestGame(numPlayers, masterSeed)
    const actions: GameAction[] = []

    const choose = (): GameAction => {
        const state = test.state
        const base = actionBase(test)
        const valid = validActionTypes(test)
        const types = weightedTypes(valid, state.machineState)
        const type = pick(types)
        switch (type) {
            case ActionType.RollDie:
                return createAction(RollDie, base)
            case ActionType.PlaceSpring: {
                const points = allIntersections().filter(
                    (point) => springPlacementProblem(state, point) === undefined
                )
                return createAction(PlaceSpring, { ...base, ...pick(points) })
            }
            case ActionType.PlaceCanal:
                return createAction(PlaceCanal, { ...base, ...pick(legalCanalEdges(state)) })
            case ActionType.PlaceHouse:
                return chooseHouse(state, base, pick)
            case ActionType.EndTurn:
                return createAction(EndTurn, base)
            default:
                return createAction(Pass, base)
        }
    }

    for (let step = 0; step < 20000 && test.state.machineState !== MachineState.EndOfGame; step++) {
        const action = choose()
        actions.push(action)
        test = execute(test, action)
    }
    return { final: test, actions }
}

function weightedTypes(valid: string[], machineState: MachineState): string[] {
    const weights: Record<string, number> = {
        [ActionType.PlaceCanal]: 5,
        [ActionType.RollDie]: 3,
        [ActionType.PlaceSpring]: 2,
        [ActionType.PlaceHouse]: 6,
        [ActionType.Pass]: 1,
        [ActionType.EndTurn]: machineState === MachineState.HouseRolled ? 1 : 2
    }
    return valid.flatMap((type) => Array<string>(weights[type] ?? 1).fill(type))
}

function chooseHouse(
    state: AquaduktGameState,
    base: { gameId: string; playerId: string },
    pick: <T>(items: readonly T[]) => T
): GameAction {
    const hydrated = new HydratedAquaduktGameState(state)
    const region = state.rolledRegion
    if (region === undefined) throw Error('No rolled region')
    const square = pick(hydrated.freeSquaresInRegion(region))
    const player = hydrated.getPlayerState(base.playerId)
    const supplied = suppliedSquareKeys(state.canals).has(squareKey(square))
    const lowest = player.lowestTileValue()
    const values = TILE_VALUES.filter((value) => player.tilesLeft(value) > 0)
    const value = supplied && lowest !== undefined ? lowest : pick(values)
    return createAction(PlaceHouse, { ...base, row: square.row, col: square.col, value })
}
