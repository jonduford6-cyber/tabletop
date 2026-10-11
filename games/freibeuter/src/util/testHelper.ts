import {
    GameEngine,
    PlayerStatus,
    createAction,
    getPrng,
    range,
    type ActionCascadeResult,
    type Game,
    type GameAction
} from '@tabletop/common'
import { CaptureShip } from '../actions/captureShip.js'
import { DrawCard } from '../actions/drawCard.js'
import { PlayDutchmanCard } from '../actions/playDutchmanCard.js'
import { PlaySeaCard } from '../actions/playSeaCard.js'
import { ResolveEntity } from '../actions/resolveEntity.js'
import { board } from '../components/board.js'
import { dutchmanCard, seaCard, type Card } from '../components/cards.js'
import { Definition } from '../definition/gameDefinition.js'
import { MachineState } from '../definition/states.js'
import {
    CounterKind,
    FreibeuterGameStateValidator,
    HydratedFreibeuterGameState,
    Pile,
    type Counter,
    type FreibeuterGameState,
    type FreibeuterProjectedState,
    type PlacedBoat
} from '../model/gameState.js'
import { dutchmanOptions } from './options.js'

export const TEST_MASTER_SEED = '0123456789abcdef0123456789abcdef'

export type TestGame = {
    engine: GameEngine<FreibeuterProjectedState, HydratedFreibeuterGameState>
    game: Game
    state: FreibeuterProjectedState
    processed: GameAction[]
    result?: ActionCascadeResult<FreibeuterProjectedState>
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
        { id: 'test-game', typeId: 'freibeuter', name: 'Test Game', players, ownerId: 'test' },
        Definition
    )
    const { startedGame, initialState } = engine.startGame(game, masterSeed)
    return { engine, game: startedGame, state: initialState, processed: [] }
}

export function canonicalState(test: TestGame): FreibeuterGameState {
    const state = test.state
    if (!FreibeuterGameStateValidator.Check(state)) throw Error('The test state is not canonical')
    return state
}

export function hydrate(test: TestGame): HydratedFreibeuterGameState {
    return new HydratedFreibeuterGameState(test.state)
}

export function activePlayerId(state: FreibeuterProjectedState): string {
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

export function captureShip(test: TestGame, intersection: string): TestGame {
    return execute(test, createAction(CaptureShip, { ...base(test), intersection }))
}

export function playSea(test: TestGame, space: string, takeTreasure?: boolean): TestGame {
    return execute(
        test,
        createAction(PlaySeaCard, {
            ...base(test),
            space,
            ...(takeTreasure === undefined ? {} : { takeTreasure })
        })
    )
}

export function playDutchman(test: TestGame, card: string, space: string): TestGame {
    return execute(test, createAction(PlayDutchmanCard, { ...base(test), card, space }))
}

export function resolve(test: TestGame, intersection: string): TestGame {
    return execute(test, createAction(ResolveEntity, { gameId: test.state.gameId, intersection }))
}

export function draw(test: TestGame, pile: Pile): TestGame {
    return execute(test, createAction(DrawCard, { ...base(test), pile }))
}

export function parseCard(text: string): Card {
    return text.includes(':') ? dutchmanCard(text) : seaCard(text)
}

export type Scenario = {
    numPlayers?: number
    turn?: string
    hands?: Record<string, string[]>
    boatsOn?: [string, string][]
    counters?: Partial<Counter>[]
    treasure?: Record<string, number>
    loans?: Record<string, number>
    supply?: Record<string, number>
    ships?: Record<string, number[]>
    removedChests?: number
    removedDoublings?: number[]
    seaPile?: string[]
    dutchmanPile?: string[]
    machineState?: MachineState
}

export function scenario(setup: Scenario = {}): TestGame {
    const test = newTestGame(setup.numPlayers ?? 4)
    const state = hydrate(test)
    const ids = state.players.map((player) => player.playerId)
    state.turnManager.turnOrder = ids
    state.turnManager.series = []
    state.counters = (setup.counters ?? []).map((counter, index) => ({
        intersection: board.intersections[index].id,
        kind: CounterKind.Ship,
        ...counter
    }))
    state.placedBoats = (setup.boatsOn ?? []).map(([space, playerId]): PlacedBoat => ({
        space,
        playerId
    }))
    state.removedChests = setup.removedChests ?? 0
    state.removedDoublings = setup.removedDoublings ?? []
    for (const player of state.players) {
        const id = player.playerId
        const hand = setup.hands?.[id]
        if (hand) {
            player.hand = hand.map(parseCard)
            player.seaCount = player.hand.filter((card) => card.type === 'sea').length
            player.dutchmanCount = player.hand.length - player.seaCount
        }
        const onBoard = state.placedBoats.filter((boat) => boat.playerId === id).length
        const captured = state.counters.filter((counter) => counter.captorId === id).length
        player.boats = setup.supply?.[id] ?? 25 - onBoard - captured
        player.treasure = setup.treasure?.[id] ?? player.treasure
        player.loans = setup.loans?.[id] ?? 0
        player.ships = setup.ships?.[id] ?? []
    }
    if (setup.seaPile) {
        state.seaPile.items = setup.seaPile.map(parseCard)
        state.seaPile.remaining = setup.seaPile.length
    }
    if (setup.dutchmanPile) {
        state.dutchmanPile.items = setup.dutchmanPile.map(parseCard)
        state.dutchmanPile.remaining = setup.dutchmanPile.length
    }
    state.machineState = setup.machineState ?? MachineState.StartOfTurn
    const turn = setup.turn ?? ids[0]
    state.turnManager.startTurn(turn, state.actionCount)
    state.activePlayerIds = [turn]
    return { ...test, state: state.dehydrate() }
}

export function withState(
    test: TestGame,
    change: (state: HydratedFreibeuterGameState) => void
): TestGame {
    const state = hydrate(test)
    change(state)
    return { ...test, state: state.dehydrate() }
}

export type ScriptedGame = {
    final: TestGame
    actions: GameAction[]
    processed: GameAction[]
}

export function playBotGame(numPlayers: number, masterSeed: string, botSeed = 1): ScriptedGame {
    const random = getPrng(botSeed)
    const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)]
    let test = newTestGame(numPlayers, masterSeed)
    const actions: GameAction[] = []
    const processed: GameAction[] = []

    const choose = (): GameAction => {
        const state = hydrate(test)
        const playerId = activePlayerId(test.state)
        const player = state.getPlayerState(playerId)
        switch (test.state.machineState) {
            case MachineState.ResolvingEntities:
                return createAction(ResolveEntity, {
                    gameId: test.state.gameId,
                    intersection: pick(state.surrounded)
                })
            case MachineState.Drawing:
                return createAction(DrawCard, {
                    ...base(test),
                    pile: pick(state.drawChoices(playerId))
                })
            default: {
                const types = validActionTypes(test)
                const weighted = types.flatMap((type) =>
                    Array<string>(type === 'captureShip' ? 2 : 4).fill(type)
                )
                const type = pick(weighted)
                if (type === 'captureShip') {
                    return createAction(CaptureShip, {
                        ...base(test),
                        intersection: pick(state.uncapturedShips()).intersection
                    })
                }
                if (type === 'playDutchmanCard') {
                    const option = pick(dutchmanOptions(state, playerId))
                    return createAction(PlayDutchmanCard, { ...base(test), ...option })
                }
                const card = pick(player.hand.filter((held) => held.type === 'sea'))
                const occupied = state.hasBoat(card.target)
                return createAction(PlaySeaCard, {
                    ...base(test),
                    space: card.target,
                    takeTreasure: occupied && random() < 0.3
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
