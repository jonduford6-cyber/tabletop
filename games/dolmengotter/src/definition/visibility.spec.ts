import { Visibility, assertExists, createAction } from '@tabletop/common'
import { Compile } from 'typebox/compile'
import { describe, expect, it } from 'vitest'
import { PlaceDolmen } from '../actions/placeDolmen.js'
import { board } from '../components/board.js'
import { DolmengotterGameState, DolmengotterProjectedState } from '../model/gameState.js'
import { BatchDolmen } from '../model/gameState.js'
import { DolmengotterPlayerState } from '../model/playerState.js'
import {
    canonicalState,
    execute,
    hydrate,
    newTestGame,
    placeDolmen,
    playBotGame,
    scenario,
    spotOf,
    stoneBy,
    type Spot,
    type TestGame
} from '../util/testHelper.js'
import { ActionType } from './actions.js'
import { DolmengotterRuntime } from './runtime.js'
import { dolmenValuesFor } from './setup.js'

const OCTAGON = 18
const spectator: Visibility.Perspective = { kind: 'spectator' }
const as = (playerId: string): Visibility.Perspective => ({ kind: 'player', playerId })
const visibility = DolmengotterRuntime.visibility

function withPlacedDolmen(value = 3): TestGame {
    const test = scenario({
        numPlayers: 3,
        stones: [
            { at: [0, 5], playerId: 'p1' },
            { at: [0, 6], playerId: 'p2' }
        ]
    })
    return placeDolmen(stoneBy(test, 'p1', [1, 4]), OCTAGON, value)
}

describe('Dolmengötter visibility annotations', () => {
    it("hides the dolmens in a player's stock from everyone but the owner", () => {
        const stock = DolmengotterPlayerState.properties.dolmens
        expect(Reflect.get(stock, Visibility.MetadataKey)).toMatchObject({
            policy: Visibility.Policy.Owner,
            redaction: { kind: 'replace', adapter: 'tabletop.empty-array' }
        })
        expect(DolmengotterPlayerState.required).toContain('dolmenCount')
        expect(
            Reflect.get(DolmengotterPlayerState.properties.dolmenCount, Visibility.MetadataKey)
        ).toBeUndefined()
    })

    it('hides the value of a dolmen lying in a circle from everyone but its owner', () => {
        expect(Reflect.get(BatchDolmen.properties.value, Visibility.MetadataKey)).toEqual({
            policy: Visibility.Policy.Owner,
            redaction: { kind: 'omit' }
        })
        expect(Reflect.get(BatchDolmen.properties.playerId, Visibility.MetadataKey)).toBeUndefined()
    })

    it('hides the value in a PlaceDolmen action from everyone but the actor', () => {
        expect(Reflect.get(PlaceDolmen.properties.value, Visibility.MetadataKey)).toEqual({
            policy: Visibility.Policy.Actor,
            redaction: { kind: 'omit' }
        })
        const projector = Visibility.createProjector(PlaceDolmen)
        const canonical = createAction(PlaceDolmen, {
            id: 'a',
            gameId: 'g',
            playerId: 'p1',
            circleId: 18,
            value: 3
        })
        expect(projector.project(canonical, as('p1'))).toEqual(canonical)
        expect(projector.project(canonical, as('p2'))).not.toHaveProperty('value')
        expect(projector.project(canonical, spectator)).not.toHaveProperty('value')
        expect(Compile(projector.schema).Check(projector.project(canonical, as('p2')))).toBe(true)
    })

    it('keeps the canonical schema strict and the projected one optional', () => {
        expect(BatchDolmen.required).toContain('value')
        const projected = Visibility.createProjectionSchema(BatchDolmen)
        expect(projected.required).not.toContain('value')
        expect(DolmengotterGameState.required).toContain('players')
        expect(DolmengotterProjectedState.properties.players).toBeDefined()
    })
})

describe('Dolmengötter state projection', () => {
    const test = withPlacedDolmen(3)
    const project = (perspective: Visibility.Perspective) =>
        visibility.state.project(canonicalState(test), perspective)

    it("shows a dolmen's value to its owner, in the circle and in the stock", () => {
        const mine = project(as('p1'))
        expect(mine.circles[OCTAGON].batch).toEqual([{ playerId: 'p1', value: 3 }])
        const player = mine.players.find((p) => p.playerId === 'p1')
        expect([...(player?.dolmens ?? [])].sort()).toEqual([1, 1, 1, 1, 2, 2, 2, 3, 4])
    })

    it('shows other players that a dolmen was placed, by whom, and where, but not its value', () => {
        for (const perspective of [as('p2'), as('p3'), spectator]) {
            const view = project(perspective)
            expect(view.circles[OCTAGON].batch).toEqual([{ playerId: 'p1' }])
            expect(view.circles[OCTAGON].batch[0]).not.toHaveProperty('value')
        }
    })

    it('shows other players the count of a stock but not the values in it', () => {
        for (const perspective of [as('p2'), spectator]) {
            const player = project(perspective).players.find((p) => p.playerId === 'p1')
            expect(player?.dolmenCount).toBe(9)
            expect(player?.dolmens).toEqual([])
        }
    })

    it("lets a player always look at their own dolmens and never at an opponent's", () => {
        const view = project(as('p2'))
        const own = view.players.find((p) => p.playerId === 'p2')
        const other = view.players.find((p) => p.playerId === 'p1')
        expect(own?.dolmens).toHaveLength(10)
        expect(other?.dolmens).toEqual([])
    })

    it('passes the projected validator and hydrates in every perspective', () => {
        const validator = Compile(DolmengotterProjectedState)
        for (const perspective of [as('p1'), as('p2'), spectator]) {
            const view = project(perspective)
            expect(validator.Check(view)).toBe(true)
            expect(() => DolmengotterRuntime.hydrator.hydrateState(view)).not.toThrow()
        }
    })

    it('does not leak the value anywhere in what an opponent receives', () => {
        const marked = withPlacedDolmen(4)
        const view = JSON.stringify(visibility.state.project(canonicalState(marked), as('p2')))
        const own = JSON.stringify(visibility.state.project(canonicalState(marked), as('p1')))
        expect(own).toContain('"value":4')
        expect(view).not.toContain('"value"')
    })
})

describe('A placed dolmen stays hidden until its circle is scored', () => {
    const places = board.circle(OCTAGON).places.map((place): Spot => [place.row, place.col])
    const before = scenario({
        numPlayers: 3,
        stones: places.slice(0, 7).map((at) => ({ at, playerId: 'p1' })),
        circles: { [OCTAGON]: { batch: [{ playerId: 'p2', value: 4 }] } }
    })
    const after = stoneBy(before, 'p1', places[7])
    const scoring = after.processed.find((action) => action.type === ActionType.ScoreCircle)

    it('shows an opponent no value while the dolmen lies in an unfinished circle', () => {
        for (const perspective of [as('p1'), as('p3'), spectator]) {
            const view = visibility.state.project(canonicalState(before), perspective)
            expect(view.circles[OCTAGON].batch).toEqual([{ playerId: 'p2' }])
        }
        expect(
            visibility.state.project(canonicalState(before), as('p2')).circles[OCTAGON].batch
        ).toEqual([{ playerId: 'p2', value: 4 }])
    })

    it('reveals the value to everyone in the public scoring record', () => {
        expect(scoring).toBeDefined()
        for (const perspective of [as('p1'), as('p2'), as('p3'), spectator]) {
            const projected = Visibility.projectActionResult({
                result: assertDefined(after.result),
                visibility,
                perspective,
                replay: { game: after.game, runtime: DolmengotterRuntime }
            })
            const record = projected.processedActions.find(
                (action) => action.type === ActionType.ScoreCircle
            )
            expect(Reflect.get(record ?? {}, 'metadata')).toEqual({
                dolmens: [{ playerId: 'p2', value: 4, factor: 5, points: 20 }]
            })
        }
    })

    it('shows the scored value in the public list of scored dolmens afterwards', () => {
        const view = visibility.state.project(canonicalState(after), spectator)
        expect(view.circles[OCTAGON].batch).toEqual([])
        expect(view.players.find((p) => p.playerId === 'p2')?.scoredValues).toEqual([4])
        expect(view.players.find((p) => p.playerId === 'p2')?.points).toBe(24)
    })
})

function assertDefined<T>(value: T | undefined): T {
    assertExists(value, 'Expected a recorded action result')
    return value
}

describe('Dolmengötter actions, undo and replay with hidden dolmens', () => {
    const test = withPlacedDolmen(3)
    const placeResult = assertDefined(test.result)
    const placeAction = placeResult.processedActions.find(
        (action) => action.type === ActionType.PlaceDolmen
    )

    it('projects a PlaceDolmen to opponents without the value and without hidden patches', () => {
        const projected = Visibility.projectActionResult({
            result: placeResult,
            visibility,
            perspective: as('p2'),
            replay: { game: test.game, runtime: DolmengotterRuntime }
        })
        const action = projected.processedActions.find((a) => a.type === ActionType.PlaceDolmen)
        expect(action).toBeDefined()
        expect(action).not.toHaveProperty('value')
        expect(action?.forwardPatch).toBeDefined()
        const reveals = (patch: { path: string; value?: unknown }[] | undefined) =>
            (patch ?? []).filter(
                (op) =>
                    /\/dolmens(\/|$)/.test(op.path) ||
                    op.path.endsWith('/value') ||
                    (typeof op.value === 'object' && op.value !== null && 'value' in op.value)
            )
        expect(reveals(action?.forwardPatch)).toEqual([])
        expect(reveals(action?.undoPatch)).toEqual([])
        expect(action?.forwardPatch).toContainEqual({
            op: 'add',
            path: '/circles/18/batch/0',
            value: { playerId: 'p1' }
        })
    })

    it('shows the actor the whole PlaceDolmen action', () => {
        const projected = Visibility.projectActionResult({
            result: placeResult,
            visibility,
            perspective: as('p1'),
            replay: { game: test.game, runtime: DolmengotterRuntime }
        })
        const action = projected.processedActions.find((a) => a.type === ActionType.PlaceDolmen)
        expect(Reflect.get(action ?? {}, 'value')).toBe(3)
    })

    it('undoes the cascade of a dolmen placement back to the exact canonical state', () => {
        const stone = scenario({
            numPlayers: 3,
            stones: [
                { at: [0, 5], playerId: 'p1' },
                { at: [0, 6], playerId: 'p2' }
            ]
        })
        const waiting = stoneBy(stone, 'p1', [1, 4])
        const action = createAction(PlaceDolmen, {
            gameId: waiting.state.gameId,
            playerId: 'p1',
            circleId: OCTAGON,
            value: 3
        })
        const result = waiting.engine.executeAction({
            action,
            state: waiting.state,
            game: waiting.game
        })
        let state = result.updatedState
        for (const processed of result.processedActions.toReversed()) {
            state = waiting.engine.undoProcessedAction({ action: processed, state })
        }
        expect(state).toEqual(waiting.state)
    })

    it('undoes a scoring cascade back to the exact canonical state', () => {
        const stones = board
            .circle(OCTAGON)
            .places.slice(0, 7)
            .map((place) => ({ at: spotOf(place), playerId: 'p1' }))
        const lastPlace = board.circle(OCTAGON).places[7]
        const start = scenario({
            numPlayers: 3,
            stones,
            circles: { [OCTAGON]: { batch: [{ playerId: 'p2', value: 4 }] } }
        })
        const prepared = { after: stoneBy(start, 'p1', [lastPlace.row, lastPlace.col]) }
        const result = assertDefined(prepared.after.result)
        expect(result.processedActions.map((a) => a.type)).toContain(ActionType.ScoreCircle)
        let state = result.updatedState
        for (const processed of result.processedActions.toReversed()) {
            state = prepared.after.engine.undoProcessedAction({ action: processed, state })
        }
        expect(state).toEqual(result.actionCascade.before)
    })

    it('marks the scoring as information-revealing so undo cannot go back past it', () => {
        const record = after().processed.find((a) => a.type === ActionType.ScoreCircle)
        expect(record?.revealsInfo).toBe(true)
        expect(placeAction?.revealsInfo).toBeUndefined()
    })

    function after(): TestGame {
        const places = board.circle(OCTAGON).places.map((place): Spot => [place.row, place.col])
        return stoneBy(
            scenario({
                numPlayers: 3,
                stones: places.slice(0, 7).map((at) => ({ at, playerId: 'p1' })),
                circles: { [OCTAGON]: { batch: [{ playerId: 'p2', value: 4 }] } }
            }),
            'p1',
            places[7]
        )
    }

    it.each([
        ['an opponent', as('p2')],
        ['the owner', as('p1')],
        ['a spectator', spectator]
    ])('lets %s replay a whole bot game from projected patches', (_name, perspective) => {
        const { actions } = playBotGame(3, '000000000000000000000000000000e7', 7)
        let canonical = newTestGame(3, '000000000000000000000000000000e7')
        let seen = visibility.state.project(canonicalState(canonical), perspective)
        for (const action of actions) {
            const result = canonical.engine.executeAction({
                action,
                state: canonical.state,
                game: canonical.game
            })
            const projected = Visibility.projectActionResult({
                result,
                visibility,
                perspective,
                replay: { game: canonical.game, runtime: DolmengotterRuntime }
            })
            for (const processed of projected.processedActions) {
                seen = canonical.engine.applyProcessedAction({
                    action: processed,
                    state: seen,
                    game: canonical.game
                })
            }
            canonical = { ...canonical, state: result.updatedState }
            expect(seen).toEqual(visibility.state.project(canonicalState(canonical), perspective))
        }
        expect(seen.machineState).toBe('EndOfGame')
    })

    it('replays a bot game from the same seed to the same canonical state', () => {
        const one = playBotGame(4, '000000000000000000000000000000e8', 3)
        let replay = newTestGame(4, '000000000000000000000000000000e8')
        for (const action of one.actions) replay = execute(replay, action)
        expect({ ...replay.state, id: one.final.state.id }).toEqual(one.final.state)
    })
})

describe('Dolmengötter exploration', () => {
    const exploration = DolmengotterRuntime.exploration

    function midGame(): TestGame {
        const bots = playBotGame(3, '000000000000000000000000000000e9', 5)
        let test = newTestGame(3, '000000000000000000000000000000e9')
        for (const action of bots.actions.slice(0, Math.floor(bots.actions.length * 0.6))) {
            test = execute(test, action)
        }
        return test
    }

    it("fills a viewer's projection with a complete state that keeps their own dolmens", () => {
        const test = midGame()
        const perspective = as('p2')
        const projected = visibility.state.project(canonicalState(test), perspective)
        const sample = exploration.createFromProjectedState({
            game: test.game,
            state: projected,
            actions: [],
            perspective,
            random: Math.random
        })
        expect(Compile(DolmengotterGameState).Check(sample)).toBe(true)
        const own = sample.players.find((p) => p.playerId === 'p2')
        const real = test.state.players.find((p) => p.playerId === 'p2')
        expect(own?.dolmens).toEqual(real?.dolmens)
    })

    it('gives opponents hidden dolmens that match the setup minus what was scored', () => {
        const test = midGame()
        const projected = visibility.state.project(canonicalState(test), as('p2'))
        const sample = hydrate({
            ...test,
            state: exploration.createFromProjectedState({
                game: test.game,
                state: projected,
                actions: [],
                perspective: as('p2'),
                random: Math.random
            })
        })
        const everyValue = dolmenValuesFor(3).sort()
        for (const player of sample.players) {
            const inBatches = sample.circles.flatMap((circle) =>
                circle.batch.filter((d) => d.playerId === player.playerId).map((d) => d.value)
            )
            expect(inBatches.every((value) => value !== undefined)).toBe(true)
            expect([...player.dolmens, ...inBatches, ...player.scoredValues].sort()).toEqual(
                everyValue
            )
            expect(player.dolmens).toHaveLength(player.dolmenCount)
        }
    })

    it('keeps the public facts of the game', () => {
        const test = midGame()
        const projected = visibility.state.project(canonicalState(test), spectator)
        const sample = exploration.createFromProjectedState({
            game: test.game,
            state: projected,
            actions: [],
            perspective: spectator,
            random: Math.random
        })
        expect(sample.stones).toEqual(test.state.stones)
        expect(sample.players.map((p) => p.points)).toEqual(test.state.players.map((p) => p.points))
        expect(sample.circles.map((c) => c.batch.map((d) => d.playerId))).toEqual(
            test.state.circles.map((c) => c.batch.map((d) => d.playerId))
        )
    })

    it('copies a canonical state unchanged', () => {
        const test = midGame()
        expect(exploration.createFromCanonicalState(test.state)).toEqual(test.state)
    })
})
