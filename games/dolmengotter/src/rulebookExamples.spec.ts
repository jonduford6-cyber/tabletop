import { describe, expect, it } from 'vitest'
import { board } from './components/board.js'
import { MachineState } from './definition/states.js'
import {
    activePlayerId,
    hydrate,
    placeDolmen,
    scenario,
    stoneBy,
    type Spot
} from './util/testHelper.js'

const OCTAGON = 18

describe('Rulebook example 1: an octagonal circle with Red, Yellow and Blue', () => {
    const places = board.circle(OCTAGON).places.map((place): Spot => [place.row, place.col])
    const [red, yellow, blue] = ['p1', 'p2', 'p3']

    it('ends with the batch Blue, Yellow, Red, Blue, Red from top to bottom and scores it', () => {
        let test = scenario({ numPlayers: 3 })
        const steps: { player: string; place: Spot; dolmen?: { player: string; value: number } }[] =
            [
                { player: red, place: places[0] },
                { player: yellow, place: places[1] },
                { player: blue, place: places[2] },
                { player: yellow, place: places[3], dolmen: { player: yellow, value: 1 } },
                { player: red, place: places[4], dolmen: { player: red, value: 2 } },
                { player: blue, place: places[5], dolmen: { player: blue, value: 3 } },
                { player: blue, place: places[6], dolmen: { player: blue, value: 4 } },
                { player: red, place: places[7], dolmen: { player: red, value: 1 } }
            ]
        const batchAfter: string[][] = []
        for (const step of steps) {
            test = stoneBy(test, step.player, step.place)
            if (step.dolmen) {
                expect(test.state.machineState).toBe(MachineState.DolmenDecision)
                expect(activePlayerId(test.state)).toBe(step.dolmen.player)
                test = placeDolmen(test, OCTAGON, step.dolmen.value)
            } else {
                expect(test.state.pendingDolmens).toEqual([])
            }
            batchAfter.push(test.state.circles[OCTAGON].batch.map((dolmen) => dolmen.playerId))
        }

        expect(batchAfter.slice(0, 3)).toEqual([[], [], []])
        expect(batchAfter[3]).toEqual([yellow])
        expect(batchAfter[4]).toEqual([yellow, red])
        expect(batchAfter[5]).toEqual([yellow, red, blue])
        expect(batchAfter[6]).toEqual([blue, yellow, red, blue])

        const scoring = test.processed.find((action) => action.type === 'scoreCircle')
        const scored = Reflect.get(scoring ?? {}, 'metadata').dolmens
        expect(scored.map((dolmen: { playerId: string }) => dolmen.playerId)).toEqual([
            blue,
            yellow,
            red,
            blue,
            red
        ])
        expect(batchAfter[7]).toEqual([])
        const points = Object.fromEntries(hydrate(test).players.map((p) => [p.playerId, p.points]))
        expect(points).toEqual({ p1: 4 + 2 * 3 + 1 * 1, p2: 4 + 1 * 4, p3: 4 + 4 * 5 + 3 * 2 })
    })
})

describe('Rulebook example 3: scoring a completed octagon with five dolmens', () => {
    it('scores 20, 8, 3, 6 and 4 points, so Yellow gets 23, Blue 12 and Red 6', () => {
        const [red, yellow, blue] = ['p1', 'p2', 'p3']
        const places = board.circle(OCTAGON).places.map((place): Spot => [place.row, place.col])
        const batch = [
            { playerId: yellow, value: 4 },
            { playerId: blue, value: 2 },
            { playerId: yellow, value: 1 },
            { playerId: red, value: 3 },
            { playerId: blue, value: 4 }
        ]
        const stones = [
            ...places.slice(0, 3).map((at) => ({ at, playerId: yellow })),
            ...places.slice(3, 5).map((at) => ({ at, playerId: blue })),
            ...places.slice(5, 7).map((at) => ({ at, playerId: red }))
        ]
        let test = scenario({
            numPlayers: 3,
            stones,
            circles: { [OCTAGON]: { hadMajority: true, batch } }
        })
        test = stoneBy(test, yellow, places[7])

        const result = hydrate(test)
        const scoring = test.processed.find((action) => action.type === 'scoreCircle')
        expect(Reflect.get(scoring ?? {}, 'metadata')).toEqual({
            dolmens: [
                { playerId: yellow, value: 4, factor: 5, points: 20 },
                { playerId: blue, value: 2, factor: 4, points: 8 },
                { playerId: yellow, value: 1, factor: 3, points: 3 },
                { playerId: red, value: 3, factor: 2, points: 6 },
                { playerId: blue, value: 4, factor: 1, points: 4 }
            ]
        })
        const gained = Object.fromEntries(result.players.map((p) => [p.playerId, p.points - 4]))
        expect(gained).toEqual({ p1: 6, p2: 23, p3: 12 })
        expect(result.circles[OCTAGON].batch).toEqual([])
        expect(result.stones.filter((stone) => stone.playerId === yellow)).toHaveLength(4)
    })
})
