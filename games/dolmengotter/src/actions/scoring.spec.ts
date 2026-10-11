import { describe, expect, it } from 'vitest'
import { board } from '../components/board.js'
import { FACTORS_TOP_DOWN, type CircleShape } from '../definition/setup.js'
import { MachineState } from '../definition/states.js'
import {
    activePlayerId,
    decideDolmens,
    hydrate,
    scenario,
    stoneBy,
    type Spot,
    type TestGame
} from '../util/testHelper.js'

function placesOf(circleId: number): Spot[] {
    return board.circle(circleId).places.map((place): Spot => [place.row, place.col])
}

function scoringOf(test: TestGame) {
    return test.processed
        .filter((action) => action.type === 'scoreCircle')
        .map((action) => ({
            circleId: Reflect.get(action, 'circleId'),
            dolmens: Reflect.get(action, 'metadata')?.dolmens
        }))
}

function completeCircle(
    circleId: number,
    batch: { playerId: string; value: number }[],
    extra: Parameters<typeof scenario>[0] = {}
) {
    const places = placesOf(circleId)
    const test = scenario({
        numPlayers: 3,
        stones: places.slice(0, -1).map((at) => ({ at, playerId: 'p1' })),
        circles: { [circleId]: { hadMajority: false, batch } },
        ...extra
    })
    return stoneBy(test, 'p1', places[places.length - 1])
}

const SHAPES: [CircleShape, number][] = [
    ['tetragonal', 0],
    ['hexagonal', 10],
    ['octagonal', 18]
]

describe.each(SHAPES)('Scoring a completed %s circle', (shape, circleId) => {
    const factors = FACTORS_TOP_DOWN[shape]

    it.each(factors.map((_, index) => index + 1))(
        'scores a batch of %i dolmens with the factors from the top down',
        (height) => {
            const batch = Array.from({ length: height }, (_, index) => ({
                playerId: index % 2 === 0 ? 'p2' : 'p3',
                value: 4 - (index % 4)
            }))
            const test = completeCircle(circleId, batch)
            const [scored] = scoringOf(test)
            expect(scored.circleId).toBe(circleId)
            expect(scored.dolmens).toEqual(
                batch.map((dolmen, index) => ({
                    ...dolmen,
                    factor: factors[index],
                    points: dolmen.value * factors[index]
                }))
            )
        }
    )

    it('gives the top dolmen the maximum factor of the shape, even when the batch is short', () => {
        const test = completeCircle(circleId, [{ playerId: 'p2', value: 2 }])
        expect(scoringOf(test)[0].dolmens[0].factor).toBe(factors[0])
        expect(hydrate(test).getPlayerState('p2').points).toBe(4 + 2 * factors[0])
    })
})

describe('Scoring', () => {
    it('gives the points to the owners of the dolmens, not to the player who completed the circle', () => {
        const test = completeCircle(0, [
            { playerId: 'p2', value: 3 },
            { playerId: 'p3', value: 1 }
        ])
        const state = hydrate(test)
        expect(state.getPlayerState('p1').points).toBe(4)
        expect(state.getPlayerState('p2').points).toBe(4 + 3 * 3)
        expect(state.getPlayerState('p3').points).toBe(4 + 1 * 2)
    })

    it('removes the scored dolmens from the game, reveals their values, and leaves the stones', () => {
        const test = completeCircle(0, [
            { playerId: 'p2', value: 3 },
            { playerId: 'p3', value: 1 }
        ])
        const state = hydrate(test)
        expect(state.circles[0].batch).toEqual([])
        expect(state.getPlayerState('p2').scoredValues).toEqual([3])
        expect(state.getPlayerState('p3').scoredValues).toEqual([1])
        expect(state.stones).toHaveLength(4)
    })

    it('marks the scoring as revealing information', () => {
        const test = completeCircle(0, [{ playerId: 'p2', value: 3 }])
        const scoring = test.processed.find((action) => action.type === 'scoreCircle')
        expect(scoring?.revealsInfo).toBe(true)
        expect(scoring?.source).toBe('system')
    })

    it('scores nothing for a completed circle without dolmens', () => {
        const test = completeCircle(0, [])
        expect(scoringOf(test)).toEqual([])
        expect(hydrate(test).players.map((player) => player.points)).toEqual([4, 4, 4])
        expect(test.state.machineState).toBe(MachineState.StartOfTurn)
    })

    it('does not score a circle that is not complete', () => {
        const places = placesOf(0)
        const test = scenario({
            numPlayers: 3,
            stones: places.slice(0, 2).map((at) => ({ at, playerId: 'p1' })),
            circles: { 0: { batch: [{ playerId: 'p2', value: 3 }] } }
        })
        const after = stoneBy(test, 'p1', places[2])
        expect(scoringOf(after)).toEqual([])
        expect(after.state.circles[0].batch).toHaveLength(1)
    })

    it('does not count a place holding a druid as filled (U12)', () => {
        const places = placesOf(0)
        const test = scenario({
            numPlayers: 3,
            stones: places.slice(0, 2).map((at) => ({ at, playerId: 'p1' })),
            druids: { p2: [{ at: places[3] }] },
            circles: { 0: { batch: [{ playerId: 'p2', value: 3 }] } }
        })
        const after = stoneBy(test, 'p1', places[2])
        expect(scoringOf(after)).toEqual([])
    })

    it('scores every circle completed by one stone', () => {
        const square = placesOf(0)
        const hexagon = placesOf(10)
        const last: Spot = [1, 2]
        const stones = [...square, ...hexagon]
            .filter(
                ([row, col], index, all) =>
                    !(row === 1 && col === 2) &&
                    all.findIndex(([r, c]) => r === row && c === col) === index
            )
            .map((at) => ({ at, playerId: 'p1' }))
        const test = stoneBy(
            scenario({
                numPlayers: 3,
                stones,
                circles: {
                    0: { batch: [{ playerId: 'p2', value: 2 }] },
                    10: { batch: [{ playerId: 'p3', value: 4 }] }
                }
            }),
            'p1',
            last
        )
        expect(
            scoringOf(test)
                .map((s) => s.circleId)
                .sort((a, b) => a - b)
        ).toEqual([0, 10])
        const state = hydrate(test)
        expect(state.getPlayerState('p2').points).toBe(4 + 2 * 3)
        expect(state.getPlayerState('p3').points).toBe(4 + 4 * 4)
    })

    it('lets the marker run past the end of the track (U16)', () => {
        const test = completeCircle(18, [{ playerId: 'p2', value: 4 }], { points: { p2: 99 } })
        expect(hydrate(test).getPlayerState('p2').points).toBe(99 + 4 * 5)
    })

    it('places the dolmens of a stone that makes a majority and completes the circle before scoring (U6)', () => {
        const places = placesOf(0)
        let test = scenario({
            numPlayers: 3,
            stones: [
                { at: places[0], playerId: 'p1' },
                { at: places[1], playerId: 'p2' },
                { at: places[2], playerId: 'p3' }
            ]
        })
        test = stoneBy(test, 'p1', places[3])
        expect(test.state.machineState).toBe(MachineState.DolmenDecision)
        expect(activePlayerId(test.state)).toBe('p1')
        test = decideDolmens(test, 3)
        expect(scoringOf(test)[0].dolmens).toEqual([
            { playerId: 'p1', value: 3, factor: 3, points: 9 }
        ])
        expect(hydrate(test).getPlayerState('p1').points).toBe(4 + 9)
    })

    it('also lets another player place a passive-majority dolmen before the circle is scored (U6)', () => {
        const places = placesOf(0)
        let test = scenario({
            numPlayers: 3,
            stones: [
                { at: places[0], playerId: 'p2' },
                { at: places[1], playerId: 'p2' },
                { at: places[2], playerId: 'p2' }
            ]
        })
        test = stoneBy(test, 'p1', places[3])
        expect(activePlayerId(test.state)).toBe('p2')
        test = decideDolmens(test, 4)
        expect(hydrate(test).getPlayerState('p2').points).toBe(4 + 4 * 3)
    })
})
