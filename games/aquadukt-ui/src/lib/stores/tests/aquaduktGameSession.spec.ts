import {
    GameEngine,
    GameStorage,
    PlayerStatus,
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
    AquaduktRuntime,
    Definition,
    EdgeOrientation,
    MachineState
} from '@tabletop/aquadukt'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { AquaduktUiRuntime } from '../../definition/gameUiRuntime.js'
import { UiDefinition } from '../../index.js'
import { AquaduktGameSession } from '../AquaduktGameSession.svelte.js'

const MASTER_SEED = '0123456789abcdef0123456789abcdef'

const HARNESS_DEFINITION = UiDefinition as unknown as GameUiDefinition<GameState, HydratedGameState>

function createSession(numPlayers = 2) {
    const game = AquaduktRuntime.initializer.initializeGame(
        {
            id: 'aquadukt-ui-game',
            typeId: Definition.info.id,
            ownerId: 'harness-user',
            name: 'Aquadukt UI',
            players: Array.from({ length: numPlayers }, (_, index) => ({
                id: `player-${index + 1}`,
                name: `Player ${index + 1}`,
                isHuman: true,
                status: PlayerStatus.Joined
            })),
            config: {},
            hotseat: true,
            seed: 11,
            storage: GameStorage.Local
        },
        Definition
    )
    const engine = new GameEngine(AquaduktRuntime)
    const { startedGame, initialState } = engine.startGame(game, MASTER_SEED)
    startedGame.activePlayerIds = [...initialState.activePlayerIds]
    const appContext = createHarnessAppContext(HARNESS_DEFINITION)
    vi.spyOn(appContext.gameService, 'saveGameLocally').mockResolvedValue(undefined)
    const bridgedContext = new BridgedContext({
        authorizationService: appContext.authorizationService,
        gameService: appContext.gameService,
        chatService: appContext.chatService,
        gameId: startedGame.id
    })
    const session = new AquaduktGameSession({
        gameService: appContext.gameService,
        bridgedContext,
        notificationService: appContext.notificationService,
        chatService: appContext.chatService,
        api: appContext.api,
        runtime: AquaduktUiRuntime,
        game: structuredClone(startedGame),
        state: structuredClone(initialState),
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

async function settle(session: AquaduktGameSession) {
    await session.waitForVisibleTransitionSettled()
    await vi.waitFor(() => expect(session.gameState.actionCount).toBe(session.actions.length))
}

function firstLegalSquare(session: AquaduktGameSession) {
    const region = session.gameState.rolledRegion
    assertExists(region, 'The die has not been rolled')
    const square = session.gameState
        .freeSquaresInRegion(region)
        .find((candidate) => session.squareStatus(candidate).legal)
    assertExists(square, 'No legal square in the rolled region')
    return square
}

let current: ReturnType<typeof createSession>

beforeEach(async () => {
    current = createSession()
    await settle(current.session)
})

afterEach(() => {
    current.dispose()
    vi.restoreAllMocks()
})

describe('AquaduktGameSession turn flow', () => {
    test('offers rolling and springs, but not canals, before any spring exists', () => {
        const { session } = current
        expect(session.validActionTypes).toContain(ActionType.RollDie)
        expect(session.validActionTypes).toContain(ActionType.PlaceSpring)
        expect(session.validActionTypes).not.toContain(ActionType.PlaceCanal)
        expect(session.unavailableReason(ActionType.PlaceCanal)).toBe('Discover a spring first')
    })

    test('stages a spring choice and undoes it before any game action', async () => {
        const { session } = current
        session.chooseAction(ActionType.PlaceSpring)
        expect(session.chosenAction).toBe(ActionType.PlaceSpring)
        expect(session.hasManualSelection).toBe(true)
        expect(session.intersectionStatus({ row: 4, col: 6 }).legal).toBe(true)

        await session.undo()
        expect(session.chosenAction).toBeUndefined()
        expect(session.hasManualSelection).toBe(false)
        expect(session.actions).toHaveLength(0)
    })

    test('plays several turns: spring, die roll and house, then canals with undo', async () => {
        const { session } = current
        const firstPlayerId = session.gameState.activePlayerIds[0]

        session.chooseAction(ActionType.PlaceSpring)
        await session.placeSpring({ row: 4, col: 6 })
        await settle(session)
        expect(session.gameState.springs).toEqual([{ row: 4, col: 6 }])
        expect(session.gameState.activePlayerIds[0]).not.toBe(firstPlayerId)
        expect(session.chosenAction).toBeUndefined()

        await session.rollDie()
        await settle(session)
        expect(session.gameState.machineState).toBe(MachineState.HouseRolled)
        expect(session.gameState.rolledRegion).toBeGreaterThanOrEqual(1)
        expect(session.chosenAction).toBe(ActionType.PlaceHouse)
        expect(session.chosenTileValue).toBeUndefined()
        expect(session.tileValues).toEqual([1, 2, 3, 4])

        const region = session.gameState.rolledRegion
        const blocked = session.squareStatus(firstLegalSquareInRegion(session, region))
        expect(blocked.legal).toBe(false)
        expect(blocked.reason).toBe('Choose a tile value first')

        session.chooseTileValue(2)
        expect(session.chosenTileValue).toBe(2)
        const target = firstLegalSquare(session)
        await session.placeHouse(target)
        await settle(session)
        expect(session.gameState.houses).toHaveLength(1)
        expect(session.gameState.houses[0]).toMatchObject({ ...target, value: 2 })
        expect(session.gameState.machineState).toBe(MachineState.HousePlaced)

        await session.endTurn()
        await settle(session)
        expect(session.gameState.activePlayerIds[0]).toBe(firstPlayerId)
        expect(session.gameState.machineState).toBe(MachineState.StartOfTurn)

        session.chooseAction(ActionType.PlaceCanal)
        const edge = { orientation: EdgeOrientation.Horizontal, row: 4, col: 6 }
        expect(session.edgeStatus(edge).legal).toBe(true)
        await session.placeCanal(edge)
        await settle(session)
        expect(session.gameState.canals).toEqual([{ ...edge, count: 1 }])
        expect(session.gameState.machineState).toBe(MachineState.CanalPlaced)
        expect(session.chosenAction).toBe(ActionType.PlaceCanal)

        const farEdge = { orientation: EdgeOrientation.Vertical, row: 0, col: 0 }
        expect(session.edgeStatus(farEdge).legal).toBe(false)
        const actionCount = session.actions.length
        await session.placeCanal(farEdge)
        expect(session.inspectionMessage).toMatch(/start at a spring or the end of a canal/)
        expect(session.actions).toHaveLength(actionCount)

        await session.undo()
        await settle(session)
        expect(session.gameState.canals).toEqual([])
        expect(session.gameState.springs).toHaveLength(1)
        expect(session.gameState.machineState).toBe(MachineState.StartOfTurn)
    })

    test('reports why an illegal spring cannot be placed without acting', async () => {
        const { session } = current
        session.chooseAction(ActionType.PlaceSpring)
        await session.placeSpring({ row: 4, col: 6 })
        await settle(session)
        session.chooseAction(ActionType.PlaceSpring)
        expect(session.intersectionStatus({ row: 4, col: 8 }).reason).toMatch(/at least 5 steps/)
        const actionCount = session.actions.length
        await session.placeSpring({ row: 4, col: 8 })
        expect(session.inspectionMessage).toMatch(/at least 5 steps/)
        expect(session.actions).toHaveLength(actionCount)
    })

    test('auto-selects the tile value when only one value is left', async () => {
        const { session } = current
        await session.rollDie()
        await settle(session)
        const playerId = session.gameState.activePlayerIds[0]
        const playerState = session.gameState.getPlayerState(playerId)
        playerState.tiles = [0, 0, 3, 0]
        expect(session.tileValues).toEqual([3])
        expect(session.chosenTileValue).toBe(3)
        expect(session.hasManualSelection).toBe(false)
    })

    test('reaches the first player again after every player acted', async () => {
        const { session } = current
        const first = session.gameState.activePlayerIds[0]
        await session.placeSpring({ row: 0, col: 0 }).catch(() => undefined)
        session.chooseAction(ActionType.PlaceSpring)
        await session.placeSpring({ row: 4, col: 6 })
        await settle(session)
        session.chooseAction(ActionType.PlaceSpring)
        await session.placeSpring({ row: 0, col: 0 })
        await settle(session)
        expect(session.gameState.activePlayerIds[0]).toBe(first)
        expect(session.gameState.springs).toHaveLength(2)
    })
})

function firstLegalSquareInRegion(session: AquaduktGameSession, region: number | undefined) {
    assertExists(region, 'The die has not been rolled')
    return session.gameState.freeSquaresInRegion(region)[0]
}
