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
    CounterKind,
    Definition,
    FreibeuterGameStateValidator,
    FreibeuterRuntime,
    HydratedFreibeuterGameState,
    MachineState,
    Pile,
    seaCard,
    dutchmanCard,
    type FreibeuterProjectedState
} from '@tabletop/freibeuter'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { FreibeuterUiRuntime } from '../../definition/gameUiRuntime.js'
import { UiDefinition } from '../../index.js'
import { recentResolutions } from '../../utils/recentResolutions.js'
import { FreibeuterGameSession } from '../FreibeuterGameSession.svelte.js'

const MASTER_SEED = '0123456789abcdef0123456789abcdef'

const HARNESS_DEFINITION = UiDefinition as unknown as GameUiDefinition<GameState, HydratedGameState>

type Setup = {
    numPlayers?: number
    hotseat?: boolean
    prepare?: (state: HydratedFreibeuterGameState) => void
    viewerPlayerId?: string
}

function createSession(setup: Setup = {}) {
    const numPlayers = setup.numPlayers ?? 2
    const game = FreibeuterRuntime.initializer.initializeGame(
        {
            id: 'freibeuter-ui-game',
            typeId: Definition.info.id,
            ownerId: 'harness-user',
            name: 'Freibeuter UI',
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
            hotseat: setup.hotseat ?? true,
            seed: 11,
            storage: GameStorage.Local
        },
        Definition
    )
    const engine = new GameEngine(FreibeuterRuntime)
    const { startedGame, initialState } = engine.startGame(game, MASTER_SEED)
    let canonical: FreibeuterProjectedState = initialState
    if (setup.prepare) {
        const state = new HydratedFreibeuterGameState(initialState)
        setup.prepare(state)
        canonical = state.dehydrate()
    }
    startedGame.activePlayerIds = [...canonical.activePlayerIds]
    if (!FreibeuterGameStateValidator.Check(canonical)) throw Error('The state is not canonical')
    const viewerPlayerId = setup.viewerPlayerId
    const shown = viewerPlayerId
        ? FreibeuterRuntime.visibility.state.project(canonical, {
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
    const session = new FreibeuterGameSession({
        gameService: appContext.gameService,
        bridgedContext,
        notificationService: appContext.notificationService,
        chatService: appContext.chatService,
        api: appContext.api,
        runtime: FreibeuterUiRuntime,
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

async function settle(session: FreibeuterGameSession) {
    await session.waitForVisibleTransitionSettled()
    await vi.waitFor(() => expect(session.gameState.actionCount).toBe(session.actions.length))
}

function startTurn(state: HydratedFreibeuterGameState, playerId: string) {
    state.turnManager.turnOrder = state.players.map((player) => player.playerId)
    state.turnManager.series = []
    state.turnManager.startTurn(playerId, state.actionCount)
    state.activePlayerIds = [playerId]
    state.machineState = MachineState.StartOfTurn
}

function setHand(state: HydratedFreibeuterGameState, playerId: string, cards: string[]) {
    const player = state.getPlayerState(playerId)
    player.hand = cards.map((text) => (text.includes(':') ? dutchmanCard(text) : seaCard(text)))
    player.seaCount = player.hand.filter((card) => card.type === 'sea').length
    player.dutchmanCount = player.hand.length - player.seaCount
}

let current: ReturnType<typeof createSession>

afterEach(() => {
    current?.dispose()
    vi.restoreAllMocks()
})

describe('Playing several turns from the real start', () => {
    beforeEach(async () => {
        current = createSession()
        await settle(current.session)
    })

    test('plays a sea card, draws, captures a ship, and rejects illegal clicks', async () => {
        const { session } = current
        const first = session.gameState.activePlayerIds[0]
        const second = session.gameState.turnManager.turnOrder.find((id) => id !== first)
        assertExists(second, 'Expected a second player')

        const sea = session.myHand.find((card) => card.type === 'sea')
        assertExists(sea, 'Expected a sea card in hand')
        expect(session.validActionTypes).toContain(ActionType.PlaySeaCard)

        const count = session.actions.length
        await session.clickSpace('A1')
        expect(session.inspectionMessage).toBe('Click a card in your hand first')
        expect(session.actions).toHaveLength(count)

        session.chooseCard(sea)
        expect(session.selectedCard).toEqual(sea)
        expect(session.legalSpaces).toEqual([sea.target])
        const other = ['A1', 'G7', 'D4'].find((space) => space !== sea.target) ?? 'A1'
        expect(session.spaceStatus(other).legal).toBe(false)
        await session.clickSpace(other)
        expect(session.inspectionMessage).toMatch(/names another space/)
        expect(session.actions).toHaveLength(count)

        await session.clickSpace(sea.target)
        await settle(session)
        expect(session.gameState.placedBoats).toEqual([{ space: sea.target, playerId: first }])
        expect(session.gameState.machineState).toBe(MachineState.Drawing)
        expect(session.gameState.seaDiscard).toEqual([sea])

        expect(session.drawChoices).toContain(Pile.Sea)
        await session.drawFrom(Pile.Sea)
        await settle(session)
        expect(session.gameState.machineState).toBe(MachineState.StartOfTurn)
        expect(session.gameState.activePlayerIds[0]).toBe(second)
        expect(session.gameState.getPlayerState(first).hand).toHaveLength(5)

        const chest = session.gameState.counters.find(
            (counter) => counter.kind === CounterKind.Chest
        )
        assertExists(chest, 'Expected a chest on the board')
        session.chooseCapture()
        expect(session.captureMode).toBe(true)
        expect(session.counterStatus(chest.intersection)).toEqual({
            legal: false,
            reason: 'Only a ship can be captured'
        })
        const afterTwo = session.actions.length
        await session.clickCounter(chest.intersection)
        expect(session.inspectionMessage).toBe('Only a ship can be captured')
        expect(session.actions).toHaveLength(afterTwo)

        const ship = session.gameState.uncapturedShips()[0]
        await session.clickCounter(ship.intersection)
        await settle(session)
        expect(session.gameState.counterAt(ship.intersection)?.captorId).toBe(second)
        expect(session.gameState.getPlayerState(second).boats).toBe(24)
        expect(session.gameState.activePlayerIds[0]).toBe(first)
        expect(session.captureMode).toBe(false)

        const turns = session.actions.length
        await session.undo()
        await settle(session)
        expect(session.actions.length).toBeLessThanOrEqual(turns)
    })

    test('stages a card and undoes it before any game action', async () => {
        const { session } = current
        const sea = session.myHand.find((card) => card.type === 'sea')
        assertExists(sea, 'Expected a sea card in hand')
        session.chooseCard(sea)
        expect(session.hasManualSelection).toBe(true)
        await session.undo()
        expect(session.selectedCard).toBeUndefined()
        expect(session.hasManualSelection).toBe(false)
    })

    test('does not let a Flying Dutchman card be played when it would surround nothing', () => {
        const { session } = current
        const dutchman = session.myHand.find((card) => card.type === 'dutchman')
        assertExists(dutchman, 'Expected a Flying Dutchman card in hand')
        expect(session.cardProblem(dutchman)).toMatch(/would not surround anything/)
        session.chooseCard(dutchman)
        expect(session.inspectionMessage).toMatch(/would not surround anything/)
        expect(session.selectedCard).toBeUndefined()
    })
})

describe('Occupied spaces and the Flying Dutchman', () => {
    test('asks Place a boat or Take 2 treasure when the space is occupied', async () => {
        current = createSession({
            numPlayers: 3,
            prepare: (state) => {
                startTurn(state, 'player-1')
                state.counters = []
                state.placedBoats = [{ space: 'C3', playerId: 'player-2' }]
                state.getPlayerState('player-2').boats = 24
                setHand(state, 'player-1', ['C3', 'D4', 'row:A'])
            }
        })
        const { session } = current
        await settle(session)
        const card = session.myHand.find((held) => held.target === 'C3')
        assertExists(card, 'Expected the C3 card')
        session.chooseCard(card)
        const count = session.actions.length
        await session.clickSpace('C3')
        expect(session.pendingOccupiedSpace).toBe('C3')
        expect(session.actions).toHaveLength(count)
        await session.playOccupied(true)
        await settle(session)
        expect(session.gameState.getPlayerState('player-1').treasure).toBe(22)
        expect(session.gameState.placedBoats).toHaveLength(1)
        expect(session.gameState.machineState).toBe(MachineState.Drawing)
    })

    test('highlights the legal spaces of a Flying Dutchman card and plays it there', async () => {
        current = createSession({
            numPlayers: 3,
            prepare: (state) => {
                startTurn(state, 'player-1')
                state.counters = [{ intersection: 'AB12', kind: CounterKind.Doubling, value: 10 }]
                state.placedBoats = [
                    { space: 'A1', playerId: 'player-2' },
                    { space: 'A2', playerId: 'player-3' },
                    { space: 'B1', playerId: 'player-2' }
                ]
                setHand(state, 'player-1', ['G7', 'row:B', 'row:G'])
            }
        })
        const { session } = current
        await settle(session)
        const card = session.myHand.find((held) => held.target === 'row:B')
        assertExists(card, 'Expected the row B card')
        expect(session.cardProblem(card)).toBeUndefined()
        const useless = session.myHand.find((held) => held.target === 'row:G')
        assertExists(useless, 'Expected the row G card')
        expect(session.cardProblem(useless)).toMatch(/would not surround anything/)

        session.chooseCard(card)
        expect(session.legalSpaces).toEqual(['B2'])
        await session.clickSpace('B5')
        expect(session.inspectionMessage).toMatch(/would not surround anything/)
        await session.clickSpace('A3')
        expect(session.inspectionMessage).toMatch(/only allows that line/)

        await session.clickSpace('B2')
        await settle(session)
        expect(session.gameState.removedDoublings).toEqual([10])
        expect(session.gameState.dutchmanAt).toBeUndefined()
        expect(session.gameState.machineState).toBe(MachineState.Drawing)
    })
})

describe('Resolving surrounded entities', () => {
    beforeEach(async () => {
        current = createSession({
            numPlayers: 3,
            prepare: (state) => {
                startTurn(state, 'player-1')
                state.counters = [
                    { intersection: 'AB12', kind: CounterKind.Chest },
                    {
                        intersection: 'AB23',
                        kind: CounterKind.Ship,
                        value: 15,
                        captorId: 'player-3'
                    }
                ]
                state.placedBoats = [
                    { space: 'A1', playerId: 'player-2' },
                    { space: 'A2', playerId: 'player-3' },
                    { space: 'B1', playerId: 'player-2' },
                    { space: 'A3', playerId: 'player-2' },
                    { space: 'B3', playerId: 'player-2' }
                ]
                state.getPlayerState('player-3').boats = 23
                state.getPlayerState('player-3').treasure = 0
                setHand(state, 'player-1', ['B2', 'C3'])
            }
        })
        await settle(current.session)
    })

    test('lets the active player choose the order and shows the payments and the loan', async () => {
        const { session } = current
        const card = session.myHand.find((held) => held.target === 'B2')
        assertExists(card, 'Expected the B2 card')
        session.chooseCard(card)
        await session.clickSpace('B2')
        await settle(session)

        expect(session.gameState.machineState).toBe(MachineState.ResolvingEntities)
        expect(session.isResolving).toBe(true)
        expect([...session.gameState.surrounded].sort()).toEqual(['AB12', 'AB23'])
        expect(session.counterStatus('AB12').legal).toBe(true)
        expect(session.counterStatus('AB23').legal).toBe(true)

        await session.clickCounter('AB23')
        await settle(session)
        expect(session.gameState.machineState).toBe(MachineState.Drawing)
        expect(session.gameState.getPlayerState('player-3').loans).toBeGreaterThan(0)
        expect(session.gameState.getPlayerState('player-3').ships).toEqual([15])

        const resolutions = recentResolutions(session.actions)
        expect(resolutions.map((resolution) => resolution.metadata?.kind)).toEqual([
            CounterKind.Ship,
            CounterKind.Chest
        ])
        const shipRecord = resolutions[0].metadata
        expect(shipRecord?.captorId).toBe('player-3')
        expect(shipRecord?.loan).toBeGreaterThan(0)
        expect(shipRecord?.payments.map((payment) => payment.playerId)).toContain('player-2')
    })

    test('draws a card afterwards, and only the sea pile when no sea card is left', async () => {
        const { session } = current
        const card = session.myHand.find((held) => held.target === 'B2')
        assertExists(card, 'Expected the B2 card')
        session.chooseCard(card)
        await session.clickSpace('B2')
        await settle(session)
        await session.clickCounter('AB12')
        await settle(session)
        expect(session.gameState.machineState).toBe(MachineState.Drawing)
        expect(session.drawChoices).toEqual([Pile.Sea, Pile.Dutchman])
        expect(session.pileReason(Pile.Sea)).toBeUndefined()
        await session.drawFrom(Pile.Dutchman)
        await settle(session)
        expect(session.gameState.getPlayerState('player-1').dutchmanCount).toBe(1)
    })
})

describe("An opponent's session", () => {
    beforeEach(async () => {
        current = createSession({
            numPlayers: 3,
            hotseat: false,
            viewerPlayerId: 'player-2',
            prepare: (state) => {
                startTurn(state, 'player-1')
                setHand(state, 'player-1', ['G7', 'B3', 'row:G'])
                setHand(state, 'player-2', ['A1', 'C3', 'col:7'])
                state.seaPile.items = ['F7', 'E3', 'E4'].map(seaCard)
                state.seaPile.remaining = 3
                state.dutchmanPile.items = ['col:1', 'row:D'].map(dutchmanCard)
                state.dutchmanPile.remaining = 2
            }
        })
        await settle(current.session)
    })

    test('shows only his own hand and the sizes of the piles', () => {
        const { session } = current
        expect(session.viewerId).toBe('player-2')
        expect(session.myHand.map((card) => card.target).sort()).toEqual(
            ['A1', 'C3', 'col:7'].sort()
        )
        const other = session.gameState.getPlayerState('player-1')
        expect(other.hand).toEqual([])
        expect(other.seaCount).toBe(2)
        expect(other.dutchmanCount).toBe(1)
        expect(session.gameState.seaPile.items).toEqual([])
        expect(session.gameState.seaPile.remaining).toBe(3)
        expect(session.gameState.dutchmanPile.items).toEqual([])
        expect(session.gameState.dutchmanPile.remaining).toBe(2)
    })

    test('never contains a hidden card or the contents of a pile', () => {
        const { session } = current
        const state = JSON.stringify(session.gameState.dehydrate())
        for (const hidden of ['G7', 'B3', 'row:G', 'F7', 'E3', 'E4', 'col:1', 'row:D']) {
            expect(state).not.toContain(`"target":"${hidden}"`)
        }
        for (const own of ['A1', 'C3', 'col:7']) {
            expect(state).toContain(`"target":"${own}"`)
        }
    })

    test("has no actions while it is another player's turn", () => {
        const { session } = current
        expect(session.isMyTurn).toBe(false)
        expect(session.validActionTypes).toEqual([])
        expect(session.canActOnBoard).toBe(false)
        expect(session.game.protectedInformation).toBe(true)
    })
})
