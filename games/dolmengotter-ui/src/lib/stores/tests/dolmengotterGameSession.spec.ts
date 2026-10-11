import {
    GameEngine,
    GameStorage,
    PlayerStatus,
    Visibility,
    assertExists,
    type GameState,
    type HydratedGameState
} from '@tabletop/common'
import {
    BridgedContext,
    createHarnessAppContext,
    type GameUiDefinition
} from '@tabletop/frontend-components'
import {
    ActionType,
    Definition,
    DolmengotterGameStateValidator,
    DolmengotterRuntime,
    HydratedDolmengotterGameState,
    MachineState,
    type DolmengotterProjectedState
} from '@tabletop/dolmengotter'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { DolmengotterUiRuntime } from '../../definition/gameUiRuntime.js'
import { UiDefinition } from '../../index.js'
import { circleStacks } from '../../utils/circleStacks.js'
import { DolmengotterGameSession } from '../DolmengotterGameSession.svelte.js'

const MASTER_SEED = '0123456789abcdef0123456789abcdef'

const HARNESS_DEFINITION = UiDefinition as unknown as GameUiDefinition<GameState, HydratedGameState>

type Setup = {
    numPlayers?: number
    hotseat?: boolean
    prepare?: (state: HydratedDolmengotterGameState) => void
    viewerPlayerId?: string
}

function createSession(setup: Setup = {}) {
    const numPlayers = setup.numPlayers ?? 2
    const hotseat = setup.hotseat ?? true
    const game = DolmengotterRuntime.initializer.initializeGame(
        {
            id: 'dolmengotter-ui-game',
            typeId: Definition.info.id,
            ownerId: 'harness-user',
            name: 'Dolmengötter UI',
            players: Array.from({ length: numPlayers }, (_, index) => ({
                id: `player-${index + 1}`,
                name: `Player ${index + 1}`,
                isHuman: true,
                status: PlayerStatus.Joined,
                ...(setup.viewerPlayerId === `player-${index + 1}`
                    ? { userId: 'harness-user' }
                    : {})
            })),
            config: {},
            hotseat,
            seed: 11,
            storage: GameStorage.Local
        },
        Definition
    )
    const engine = new GameEngine(DolmengotterRuntime)
    const { startedGame, initialState } = engine.startGame(game, MASTER_SEED)
    let canonical: DolmengotterProjectedState = initialState
    if (setup.prepare) {
        const state = new HydratedDolmengotterGameState(initialState)
        setup.prepare(state)
        canonical = state.dehydrate()
    }
    startedGame.activePlayerIds = [...canonical.activePlayerIds]
    const viewerPlayerId = setup.viewerPlayerId
    if (!DolmengotterGameStateValidator.Check(canonical)) throw Error('The state is not canonical')
    const shown = viewerPlayerId
        ? DolmengotterRuntime.visibility.state.project(canonical, {
              kind: 'player',
              playerId: viewerPlayerId
          })
        : canonical
    const appContext = createHarnessAppContext(HARNESS_DEFINITION)
    vi.spyOn(appContext.gameService, 'saveGameLocally').mockResolvedValue(undefined)
    const bridgedContext = new BridgedContext({
        authorizationService: appContext.authorizationService,
        gameService: appContext.gameService,
        chatService: appContext.chatService,
        gameId: startedGame.id
    })
    const session = new DolmengotterGameSession({
        gameService: appContext.gameService,
        bridgedContext,
        notificationService: appContext.notificationService,
        chatService: appContext.chatService,
        api: appContext.api,
        runtime: DolmengotterUiRuntime,
        game: structuredClone(startedGame),
        state: structuredClone(shown),
        actions: []
    })
    return {
        session,
        dispose() {
            session.dispose()
            bridgedContext.dispose()
        }
    }
}

async function settle(session: DolmengotterGameSession) {
    await session.waitForVisibleTransitionSettled()
    await vi.waitFor(() => expect(session.gameState.actionCount).toBe(session.actions.length))
}

function startTurn(state: HydratedDolmengotterGameState, playerId: string) {
    state.turnManager.turnOrder = state.players.map((player) => player.playerId)
    state.turnManager.series = []
    state.turnManager.startTurn(playerId, state.actionCount)
    state.activePlayerIds = [playerId]
    state.machineState = MachineState.StartOfTurn
}

let current: ReturnType<typeof createSession>

afterEach(() => {
    current?.dispose()
    vi.restoreAllMocks()
})

describe('Placing the druids', () => {
    beforeEach(async () => {
        current = createSession()
        await settle(current.session)
    })

    test('lets each player click a free stone place, and refuses an occupied one', async () => {
        const { session } = current
        expect(session.isPlacingDruids).toBe(true)
        const first = session.gameState.activePlayerIds[0]

        await session.clickPlace({ row: 2, col: 2 })
        await settle(session)
        expect(session.gameState.getPlayerState(first).druids).toEqual([
            { row: 2, col: 2, belly: false }
        ])
        expect(session.gameState.activePlayerIds[0]).not.toBe(first)

        const count = session.actions.length
        await session.clickPlace({ row: 2, col: 2 })
        expect(session.inspectionMessage).toMatch(/already holds a druid/)
        expect(session.actions).toHaveLength(count)
        expect(session.placeStatus({ row: 2, col: 2 }).legal).toBe(false)
        expect(session.placeStatus({ row: 4, col: 3 }).legal).toBe(true)
    })
})

describe('Playing several turns', () => {
    beforeEach(async () => {
        current = createSession()
        await settle(current.session)
    })

    async function placeAllDruids(session: DolmengotterGameSession) {
        const spots = [
            { row: 2, col: 2 },
            { row: 9, col: 2 },
            { row: 4, col: 3 },
            { row: 9, col: 4 },
            { row: 6, col: 4 },
            { row: 9, col: 7 }
        ]
        for (const spot of spots) {
            await session.clickPlace(spot)
            await settle(session)
        }
    }

    test('walks, decides about the stone, collects herbs, flies and undoes', async () => {
        const { session } = current
        await placeAllDruids(session)
        expect(session.gameState.machineState).toBe(MachineState.StartOfTurn)
        const first = session.gameState.activePlayerIds[0]
        const second = session.gameState.turnManager.turnOrder.find((id) => id !== first)
        assertExists(second, 'Expected a second player')

        expect(session.unavailableReason(ActionType.Flight)).toMatch(/lies on its belly|belly/)
        expect(session.validActionTypes).not.toContain(ActionType.Flight)

        session.chooseAction(ActionType.Walk)
        expect(session.chosenAction).toBe(ActionType.Walk)
        expect(session.eligibleDruids()).toHaveLength(3)
        expect(session.chosenDruid).toBeUndefined()

        await session.clickPlace({ row: 1, col: 2 })
        expect(session.inspectionMessage).toMatch(/upright druids first/)

        await session.clickPlace({ row: 2, col: 2 })
        expect(session.chosenDruid).toEqual({ row: 2, col: 2, belly: false })
        const destinationKeys = session.destinations.map((place) => `${place.row},${place.col}`)
        expect(destinationKeys.sort()).toEqual(['1,2', '2,1', '3,3'])

        const count = session.actions.length
        await session.clickPlace({ row: 9, col: 2 })
        expect(session.inspectionMessage).toMatch(/holds a druid/)
        await session.clickPlace({ row: 4, col: 5 })
        expect(session.inspectionMessage).toMatch(/neighbouring/)
        expect(session.actions).toHaveLength(count)

        await session.clickPlace({ row: 1, col: 2 })
        await settle(session)
        expect(session.gameState.machineState).toBe(MachineState.StoneDecision)
        expect(session.vacatedPlace).toEqual({ row: 2, col: 2 })
        expect(session.declineStoneProblem).toBeUndefined()
        expect(session.declineStoneCost).toBe('Declining moves your marker back from 4 to 3')

        await session.placeStone()
        await settle(session)
        expect(session.gameState.stones).toEqual([{ row: 2, col: 2, playerId: first }])
        expect(session.gameState.activePlayerIds[0]).toBe(second)
        expect(session.chosenAction).toBeUndefined()

        session.chooseAction(ActionType.CollectHerbs)
        await session.clickPlace({ row: 9, col: 2 })
        expect(session.chosenDruid).toEqual({ row: 9, col: 2, belly: false })
        await session.collectHerbs()
        await settle(session)
        expect(session.gameState.getPlayerState(second).druids[0].belly).toBe(true)
        expect(session.gameState.activePlayerIds[0]).toBe(first)

        session.chooseAction(ActionType.Walk)
        await session.clickPlace({ row: 4, col: 3 })
        await session.clickPlace({ row: 5, col: 4 })
        await settle(session)
        await session.declineStone()
        await settle(session)
        expect(session.gameState.getPlayerState(first).points).toBe(3)
        expect(session.gameState.activePlayerIds[0]).toBe(second)

        expect(session.validActionTypes).toContain(ActionType.Flight)
        session.chooseAction(ActionType.Flight)
        expect(session.eligibleDruids()).toHaveLength(1)
        expect(session.chosenDruid).toEqual({ row: 9, col: 2, belly: true })
        await session.clickPlace({ row: 7, col: 3 })
        await settle(session)
        expect(session.gameState.machineState).toBe(MachineState.StoneDecision)
        expect(session.vacatedPlace).toEqual({ row: 9, col: 2 })
        await session.placeStone()
        await settle(session)
        expect(session.gameState.stones).toHaveLength(2)

        const turnsBefore = session.actions.length
        await session.undo()
        await settle(session)
        expect(session.actions.length).toBeLessThan(turnsBefore)
    })

    test('stages a choice and undoes it before any game action', async () => {
        const { session } = current
        await placeAllDruids(session)
        session.chooseAction(ActionType.Walk)
        expect(session.hasManualSelection).toBe(true)
        await session.undo()
        expect(session.chosenAction).toBeUndefined()
        expect(session.hasManualSelection).toBe(false)
    })

    test('cannot decline the stone when the marker is on field 1', async () => {
        const { session } = current
        await placeAllDruids(session)
        session.chooseAction(ActionType.Walk)
        await session.clickPlace({ row: 2, col: 2 })
        const first = session.gameState.activePlayerIds[0]
        session.gameState.getPlayerState(first).points = 1
        await session.clickPlace({ row: 1, col: 2 })
        await settle(session)
        session.gameState.getPlayerState(first).points = 1
        expect(session.declineStoneProblem).toMatch(/field 1/)
        expect(session.declineStoneCost).toBeUndefined()
        const count = session.actions.length
        await session.declineStone()
        expect(session.inspectionMessage).toMatch(/field 1/)
        expect(session.actions).toHaveLength(count)
    })
})

describe('The dolmen decision', () => {
    beforeEach(async () => {
        current = createSession({
            prepare: (state) => {
                startTurn(state, 'player-1')
                state.getPlayerState('player-1').druids = [{ row: 1, col: 2, belly: true }]
                state.getPlayerState('player-2').druids = [{ row: 9, col: 7, belly: false }]
                state.stones = [
                    { row: 1, col: 1, playerId: 'player-2' },
                    { row: 2, col: 1, playerId: 'player-2' },
                    { row: 0, col: 3, playerId: 'player-2' },
                    { row: 1, col: 4, playerId: 'player-2' }
                ]
                state.getPlayerState('player-2').stones -= 4
            }
        })
        await settle(current.session)
    })

    test('asks the player with two circles to choose one, then a value', async () => {
        const { session } = current
        session.chooseAction(ActionType.Flight)
        await session.clickPlace({ row: 7, col: 3 })
        await settle(session)
        await session.placeStone()
        await settle(session)

        expect(session.gameState.machineState).toBe(MachineState.DolmenDecision)
        expect(session.gameState.activePlayerIds[0]).toBe('player-2')
        expect(session.myDolmenRights.map((right) => right.circleId).sort((a, b) => a - b)).toEqual(
            [0, 10]
        )
        expect(session.chosenCircleId).toBeUndefined()
        expect(session.placeDolmenProblem).toBe('Choose the circle first')

        await session.placeDolmen()
        expect(session.inspectionMessage).toBe('Choose the circle first')

        session.clickCircle(5)
        expect(session.inspectionMessage).toMatch(/no dolmen decision/)

        session.clickCircle(10)
        expect(session.chosenCircleId).toBe(10)
        expect(session.placeDolmenProblem).toBe('Choose which of your dolmens to place')
        expect(session.myStock.map((entry) => entry.value)).toEqual([4, 3, 2, 1])

        session.chooseDolmenValue(3)
        expect(session.chosenDolmenValue).toBe(3)
        expect(session.placeDolmenProblem).toBeUndefined()
        await session.placeDolmen()
        await settle(session)

        expect(session.gameState.circles[10].batch).toEqual([{ playerId: 'player-2', value: 3 }])
        expect(session.gameState.machineState).toBe(MachineState.DolmenDecision)
        expect(session.myDolmenRights.map((right) => right.circleId)).toEqual([0])
        expect(session.chosenCircleId).toBe(0)

        await session.declineDolmen()
        await settle(session)
        expect(session.gameState.circles[0].batch).toEqual([])
        expect(session.gameState.machineState).toBe(MachineState.StartOfTurn)
        expect(session.gameState.activePlayerIds[0]).toBe('player-2')
    })
})

describe("An opponent's session", () => {
    beforeEach(async () => {
        current = createSession({
            hotseat: false,
            numPlayers: 3,
            viewerPlayerId: 'player-2',
            prepare: (state) => {
                startTurn(state, 'player-1')
                state.circles[18].batch = [
                    { playerId: 'player-1', value: 4 },
                    { playerId: 'player-2', value: 1 }
                ]
                state.getPlayerState('player-1').dolmens = [4, 3, 3, 1]
                state.getPlayerState('player-1').dolmenCount = 4
            }
        })
        await settle(current.session)
    })

    test("shows the owner's own value and never the opponent's", () => {
        const { session } = current
        expect(session.viewerId).toBe('player-2')
        const items = circleStacks(session.gameState, session.viewerId)[18].items
        expect(items).toEqual([{ playerId: 'player-1' }, { playerId: 'player-2', label: 1 }])
        expect(session.gameState.getPlayerState('player-1').dolmens).toEqual([])
        expect(session.gameState.getPlayerState('player-1').dolmenCount).toBe(4)
        expect(session.myStock.length).toBeGreaterThan(0)
        const state = session.gameState.dehydrate()
        expect(state.circles[18].batch[0]).toEqual({ playerId: 'player-1' })
        expect(JSON.stringify(state)).not.toContain('"value":4')
    })

    test("has no actions while it is another player's turn", () => {
        const { session } = current
        expect(session.isMyTurn).toBe(false)
        expect(session.validActionTypes).toEqual([])
        expect(session.canActOnBoard).toBe(false)
    })

    test('uses the projected visibility of the game', () => {
        const { session } = current
        expect(session.game.protectedInformation).toBe(true)
        expect(DolmengotterRuntime.visibility).toBeDefined()
        expect(Visibility.getGameVisibility(session.game, DolmengotterRuntime)).toBeDefined()
    })
})
