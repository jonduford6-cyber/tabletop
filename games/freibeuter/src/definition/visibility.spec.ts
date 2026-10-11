import { Visibility, assertExists, createAction } from '@tabletop/common'
import { Compile } from 'typebox/compile'
import { describe, expect, it } from 'vitest'
import { DrawCard } from '../actions/drawCard.js'
import { PlaySeaCard } from '../actions/playSeaCard.js'
import { CardPile } from '../components/cardPile.js'
import { allDutchmanCards, allSeaCards, CardType, removeOne } from '../components/cards.js'
import {
    CounterKind,
    FreibeuterGameState,
    FreibeuterProjectedState,
    Pile
} from '../model/gameState.js'
import { FreibeuterPlayerState } from '../model/playerState.js'
import {
    canonicalState,
    draw,
    execute,
    hydrate,
    newTestGame,
    playBotGame,
    playSea,
    scenario,
    type TestGame
} from '../util/testHelper.js'
import { ActionType } from './actions.js'
import { FreibeuterRuntime } from './runtime.js'

const spectator: Visibility.Perspective = { kind: 'spectator' }
const as = (playerId: string): Visibility.Perspective => ({ kind: 'player', playerId })
const visibility = FreibeuterRuntime.visibility

function assertDefined<T>(value: T | undefined): T {
    assertExists(value, 'Expected a recorded action result')
    return value
}

const secretGame = () =>
    scenario({
        numPlayers: 3,
        hands: { p1: ['G7', 'B3', 'row:G'], p2: ['A1', 'C3', 'col:7'] },
        seaPile: ['F7', 'E3', 'E4'],
        dutchmanPile: ['col:1', 'row:D']
    })

const project = (test: TestGame, perspective: Visibility.Perspective) =>
    visibility.state.project(canonicalState(test), perspective)

describe('Freibeuter visibility annotations', () => {
    it('hides a hand from everyone but its owner', () => {
        const hand = FreibeuterPlayerState.properties.hand
        expect(Reflect.get(hand, Visibility.MetadataKey)).toMatchObject({
            policy: Visibility.Policy.Owner,
            redaction: { kind: 'replace', adapter: 'tabletop.empty-array' }
        })
        expect(
            Reflect.get(FreibeuterPlayerState.properties.seaCount, Visibility.MetadataKey)
        ).toBeUndefined()
        expect(
            Reflect.get(FreibeuterPlayerState.properties.dutchmanCount, Visibility.MetadataKey)
        ).toBeUndefined()
    })

    it('hides the contents of a draw pile from everyone but keeps its size public', () => {
        expect(Reflect.get(CardPile.properties.items, Visibility.MetadataKey)).toMatchObject({
            policy: Visibility.Policy.HostOnly,
            redaction: { kind: 'replace', adapter: 'tabletop.empty-array' }
        })
        expect(Reflect.get(CardPile.properties.remaining, Visibility.MetadataKey)).toBeUndefined()
    })

    it('hides the drawn card in a DrawCard action from everyone but the drawer', () => {
        expect(Reflect.get(DrawCard.properties.card, Visibility.MetadataKey)).toEqual({
            policy: Visibility.Policy.Actor,
            redaction: { kind: 'omit' }
        })
    })

    it('keeps the canonical schema strict and the projected one without hidden fields', () => {
        expect(FreibeuterGameState.required).toContain('seaPile')
        expect(FreibeuterProjectedState.properties.players).toBeDefined()
    })
})

describe('Freibeuter state projection', () => {
    const test = secretGame()

    it('shows a player his own hand', () => {
        const mine = project(test, as('p1')).players.find((player) => player.playerId === 'p1')
        expect(mine?.hand).toEqual([
            { type: CardType.Sea, target: 'G7' },
            { type: CardType.Sea, target: 'B3' },
            { type: CardType.Dutchman, target: 'row:G' }
        ])
    })

    it("shows other players no card of an opponent's hand, only how many of each kind", () => {
        for (const perspective of [as('p2'), as('p3'), spectator]) {
            const other = project(test, perspective).players.find(
                (player) => player.playerId === 'p1'
            )
            expect(other?.hand).toEqual([])
            expect(other?.seaCount).toBe(2)
            expect(other?.dutchmanCount).toBe(1)
        }
    })

    it('shows nobody the contents or the order of a draw pile, but its size', () => {
        for (const perspective of [as('p1'), as('p2'), spectator]) {
            const view = project(test, perspective)
            expect(view.seaPile).toEqual({ items: [], remaining: 3 })
            expect(view.dutchmanPile).toEqual({ items: [], remaining: 2 })
        }
    })

    it('shows everyone the discard piles', () => {
        const played = playSea(test, 'G7')
        for (const perspective of [as('p2'), spectator]) {
            expect(project(played, perspective).seaDiscard).toEqual([
                { type: CardType.Sea, target: 'G7' }
            ])
        }
    })

    it('shows everyone treasure, loans, boats, captured ships and counters', () => {
        const prepared = scenario({
            counters: [{ intersection: 'AB12', kind: CounterKind.Ship, value: 10, captorId: 'p3' }],
            boatsOn: [['A1', 'p2']],
            ships: { p3: [15] },
            loans: { p4: 3 },
            treasure: { p1: 31 }
        })
        const view = project(prepared, spectator)
        expect(view.players.map((player) => player.treasure)).toEqual([31, 20, 20, 20])
        expect(view.players[3].loans).toBe(3)
        expect(view.players[2].ships).toEqual([15])
        expect(view.placedBoats).toEqual([{ space: 'A1', playerId: 'p2' }])
        expect(view.counters).toHaveLength(1)
    })

    it('passes the projected validator and hydrates in every perspective', () => {
        const validator = Compile(FreibeuterProjectedState)
        for (const perspective of [as('p1'), as('p2'), spectator]) {
            const view = project(test, perspective)
            expect(validator.Check(view)).toBe(true)
            expect(() => FreibeuterRuntime.hydrator.hydrateState(view)).not.toThrow()
        }
    })

    it('does not leak a single-copy card that only the owner or the pile holds', () => {
        const forP2 = JSON.stringify(project(test, as('p2')))
        expect(forP2).not.toContain('"target":"G7"')
        expect(forP2).not.toContain('"target":"F7"')
        expect(forP2).toContain('"target":"C3"')
        const forP1 = JSON.stringify(project(test, as('p1')))
        expect(forP1).toContain('"target":"G7"')
        expect(forP1).not.toContain('"target":"F7"')
        expect(forP1).not.toContain('"target":"C3"')
    })
})

describe('Actions, undo and replay with hidden cards', () => {
    const forDraw = () => {
        const played = playSea(secretGame(), 'B3')
        return draw(played, Pile.Sea)
    }

    it('shows the drawer the card he drew and everyone else only the pile', () => {
        const done = forDraw()
        const result = assertDefined(done.result)
        const seen = (perspective: Visibility.Perspective) =>
            Visibility.projectActionResult({
                result,
                visibility,
                perspective,
                replay: { game: done.game, runtime: FreibeuterRuntime }
            }).processedActions.find((action) => action.type === ActionType.DrawCard)
        expect(Reflect.get(seen(as('p1')) ?? {}, 'card')).toEqual({
            type: CardType.Sea,
            target: 'E4'
        })
        for (const perspective of [as('p2'), spectator]) {
            const action = seen(perspective)
            expect(action).toBeDefined()
            expect(action).not.toHaveProperty('card')
            expect(Reflect.get(action ?? {}, 'pile')).toBe(Pile.Sea)
            expect(JSON.stringify(action?.forwardPatch)).not.toContain('E4')
            expect(JSON.stringify(action?.undoPatch)).not.toContain('E4')
        }
    })

    it('marks the draw, and not the other actions, as information-revealing', () => {
        const played = playSea(secretGame(), 'B3')
        expect(played.processed.every((action) => action.revealsInfo !== true)).toBe(true)
        const drawn = draw(played, Pile.Sea)
        const record = drawn.processed.find((action) => action.type === ActionType.DrawCard)
        expect(record?.revealsInfo).toBe(true)
    })

    it('undoes a played card back to the exact canonical state', () => {
        const before = secretGame()
        const action = createAction(PlaySeaCard, {
            gameId: before.state.gameId,
            playerId: 'p1',
            space: 'B3'
        })
        const result = before.engine.executeAction({
            action,
            state: before.state,
            game: before.game
        })
        let state = result.updatedState
        for (const processed of result.processedActions.toReversed()) {
            state = before.engine.undoProcessedAction({ action: processed, state })
        }
        expect(state).toEqual(before.state)
    })

    it('undoes a draw back to the exact canonical state (the draw is the barrier for undo)', () => {
        const played = playSea(secretGame(), 'B3')
        const result = assertDefined(draw(played, Pile.Sea).result)
        let state = result.updatedState
        for (const processed of result.processedActions.toReversed()) {
            state = played.engine.undoProcessedAction({ action: processed, state })
        }
        expect(state).toEqual(played.state)
    })

    it.each([
        ['an opponent', as('p2')],
        ['the owner', as('p1')],
        ['a spectator', spectator]
    ])('lets %s replay a whole bot game from projected patches', (_name, perspective) => {
        const seed = '000000000000000000000000000000e7'
        const { actions } = playBotGame(3, seed, 7)
        let canonical = newTestGame(3, seed)
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
                replay: { game: canonical.game, runtime: FreibeuterRuntime }
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
        const seed = '000000000000000000000000000000e8'
        const one = playBotGame(4, seed, 3)
        let replay = newTestGame(4, seed)
        for (const action of one.actions) replay = execute(replay, action)
        expect({ ...replay.state, id: one.final.state.id }).toEqual(one.final.state)
    })
})

describe('Freibeuter exploration', () => {
    const exploration = FreibeuterRuntime.exploration

    function midGame(): TestGame {
        const bots = playBotGame(3, '000000000000000000000000000000e9', 5)
        let test = newTestGame(3, '000000000000000000000000000000e9')
        for (const action of bots.actions.slice(0, Math.floor(bots.actions.length * 0.5))) {
            test = execute(test, action)
        }
        return test
    }

    const populate = (test: TestGame, perspective: Visibility.Perspective) =>
        exploration.createFromProjectedState({
            game: test.game,
            state: project(test, perspective),
            actions: [],
            perspective,
            random: Math.random
        })

    it("fills a viewer's projection with a complete state that keeps his own hand", () => {
        const test = midGame()
        const sample = populate(test, as('p2'))
        expect(Compile(FreibeuterGameState).Check(sample)).toBe(true)
        expect(sample.players[1].hand).toEqual(test.state.players[1].hand)
    })

    it('gives opponents hands of the known size and fills the piles to their sizes', () => {
        const test = midGame()
        const sample = hydrate({ ...test, state: populate(test, as('p2')) })
        for (const player of sample.players) {
            expect(player.hand).toHaveLength(player.seaCount + player.dutchmanCount)
            expect(player.hand.filter((card) => card.type === CardType.Sea)).toHaveLength(
                player.seaCount
            )
        }
        expect(sample.seaPile.items).toHaveLength(sample.seaPile.remaining)
        expect(sample.dutchmanPile.items).toHaveLength(sample.dutchmanPile.remaining)
    })

    it('uses every card exactly once: hands, piles and discards together make the 88 cards', () => {
        const test = midGame()
        const sample = hydrate({ ...test, state: populate(test, spectator) })
        const everyCard = [
            ...sample.players.flatMap((player) => player.hand),
            ...sample.seaPile.items,
            ...sample.dutchmanPile.items,
            ...sample.seaDiscard,
            ...sample.dutchmanDiscard
        ]
        const expected = [...allSeaCards(), ...allDutchmanCards()]
        expect(everyCard).toHaveLength(88)
        for (const card of expected) expect(removeOne(everyCard, card)).toBe(true)
    })

    it('keeps the public facts of the game', () => {
        const test = midGame()
        const sample = populate(test, spectator)
        expect(sample.placedBoats).toEqual(test.state.placedBoats)
        expect(sample.counters).toEqual(test.state.counters)
        expect(sample.players.map((player) => player.treasure)).toEqual(
            test.state.players.map((player) => player.treasure)
        )
    })

    it('copies a canonical state unchanged', () => {
        const test = midGame()
        expect(exploration.createFromCanonicalState(test.state)).toEqual(test.state)
    })
})
