import { HydratedDolmengotterGameState, Definition } from '@tabletop/dolmengotter'
import { GameEngine, PlayerStatus, Visibility } from '@tabletop/common'
import { describe, expect, it } from 'vitest'
import { circleStacks, stockOf } from './circleStacks.js'

const SECRET_P1 = 4
const SECRET_P2 = 1

function canonicalState() {
    const engine = new GameEngine(Definition.runtime)
    const game = Definition.runtime.initializer.initializeGame(
        {
            id: 'stack-test',
            typeId: 'dolmengotter',
            ownerId: 'test',
            name: 'Stacks',
            players: ['p1', 'p2', 'p3'].map((id) => ({
                id,
                name: id,
                isHuman: true,
                status: PlayerStatus.Joined
            }))
        },
        Definition
    )
    const { startedGame, initialState } = engine.startGame(game, '0123456789abcdef0123456789abcdef')
    const state = new HydratedDolmengotterGameState(initialState)
    state.circles[18].batch = [
        { playerId: 'p1', value: SECRET_P1 },
        { playerId: 'p2', value: SECRET_P2 }
    ]
    state.getPlayerState('p1').dolmens = [4, 3, 3, 1]
    state.getPlayerState('p1').dolmenCount = 4
    return { game: startedGame, canonical: state.dehydrate() }
}

function viewFor(perspective: Visibility.Perspective) {
    const { canonical } = canonicalState()
    const projected = Definition.runtime.visibility?.state.project(canonical, perspective)
    if (!projected) throw Error('The game has no visibility')
    return new HydratedDolmengotterGameState(projected)
}

describe('An opponent never sees a dolmen value that is still hidden', () => {
    it("labels only the viewer's own dolmens in a circle", () => {
        const mine = circleStacks(viewFor({ kind: 'player', playerId: 'p2' }), 'p2')[18].items
        expect(mine).toEqual([{ playerId: 'p1' }, { playerId: 'p2', label: SECRET_P2 }])
        const theirs = circleStacks(viewFor({ kind: 'player', playerId: 'p1' }), 'p1')[18].items
        expect(theirs).toEqual([{ playerId: 'p1', label: SECRET_P1 }, { playerId: 'p2' }])
    })

    it('gives a bystander no labels at all', () => {
        const spectator = circleStacks(viewFor({ kind: 'spectator' }), undefined)[18].items
        expect(spectator).toEqual([{ playerId: 'p1' }, { playerId: 'p2' }])
        const third = circleStacks(viewFor({ kind: 'player', playerId: 'p3' }), 'p3')[18].items
        expect(third).toEqual([{ playerId: 'p1' }, { playerId: 'p2' }])
    })

    it('does not label a dolmen for a viewer even if the state carries every value', () => {
        const { canonical } = canonicalState()
        const everything = new HydratedDolmengotterGameState(canonical)
        const items = circleStacks(everything, 'p3')[18].items
        expect(items.every((item) => item.label === undefined)).toBe(true)
    })

    it("carries no secret value anywhere in the opponent's state", () => {
        const state = viewFor({ kind: 'player', playerId: 'p2' }).dehydrate()
        expect(state.circles[18].batch).toEqual([
            { playerId: 'p1' },
            { playerId: 'p2', value: SECRET_P2 }
        ])
        expect(state.players.find((p) => p.playerId === 'p1')?.dolmens).toEqual([])
        expect(JSON.stringify(state)).not.toContain('"dolmens":[4,3,3,1]')
    })

    it('shows the stock values only to the owner', () => {
        expect(stockOf(viewFor({ kind: 'player', playerId: 'p1' }), 'p1', 'p1')).toEqual([
            { value: 4, count: 1 },
            { value: 3, count: 2 },
            { value: 1, count: 1 }
        ])
        expect(stockOf(viewFor({ kind: 'player', playerId: 'p2' }), 'p1', 'p2')).toBeUndefined()
        expect(stockOf(viewFor({ kind: 'spectator' }), 'p1', undefined)).toBeUndefined()
    })

    it("keeps the count of an opponent's dolmens public", () => {
        const view = viewFor({ kind: 'player', playerId: 'p2' })
        expect(view.getPlayerState('p1').dolmenCount).toBe(4)
    })
})
