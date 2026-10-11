import { describe, expect, it } from 'vitest'
import { CounterKind, EndReason } from './model/gameState.js'
import { FreibeuterRuntime } from './definition/runtime.js'
import { MachineState } from './definition/states.js'
import { finalScore } from './util/scoring.js'
import { captureShip, hydrate, playSea, scenario, withState } from './util/testHelper.js'

describe('Rulebook example: a captured ship is surrounded (payments and loan)', () => {
    const [brigit, david, conrad] = ['p1', 'p2', 'p3']

    const setup = () =>
        scenario({
            numPlayers: 3,
            hands: { [brigit]: ['B2'] },
            counters: [
                { intersection: 'AB12', kind: CounterKind.Ship, value: 15, captorId: conrad }
            ],
            boatsOn: [
                ['A1', brigit],
                ['A2', conrad],
                ['B1', david]
            ],
            treasure: { [conrad]: 2 }
        })

    it('has Conrad pay Brigit 6 and David 3 although he only has 2', () => {
        const done = playSea(setup(), 'B2')
        const players = Object.fromEntries(
            done.state.players.map((player) => [player.playerId, player])
        )
        expect(players[brigit].treasure).toBe(20 + 6)
        expect(players[david].treasure).toBe(20 + 3)
        const metadata = Reflect.get(
            done.processed.find((action) => action.type === 'resolveEntity') ?? {},
            'metadata'
        )
        expect(metadata.payments).toEqual([
            { playerId: brigit, amount: 6 },
            { playerId: david, amount: 3 }
        ])
    })

    it('has him borrow 7: he ends with no treasure and a loan of 7', () => {
        const done = playSea(setup(), 'B2')
        const conradState = done.state.players[2]
        expect(conradState.loans).toBe(7)
        expect(conradState.treasure).toBe(0)
    })

    it('has him take the ship face down and get his capturing boat back', () => {
        const before = setup()
        expect(before.state.players[2].boats).toBe(23)
        const done = playSea(before, 'B2')
        const conradState = done.state.players[2]
        expect(conradState.ships).toEqual([15])
        expect(conradState.boats).toBe(24)
        expect(done.state.counters).toEqual([])
    })

    it('blocks one of his boats because of the loan, and Brigit then draws', () => {
        const done = playSea(setup(), 'B2')
        const conradState = hydrate(done).getPlayerState(conrad)
        expect(conradState.blockedBoats).toBe(1)
        expect(conradState.placeableBoats).toBe(23)
        expect(done.state.machineState).toBe(MachineState.Drawing)
        expect(done.state.activePlayerIds).toEqual([brigit])
    })
})

describe('Rulebook example: the final scoring', () => {
    it('scores 126 for Brigit with the doubling counters 10 and 15 removed', () => {
        const brigit = {
            playerId: 'brigit',
            treasure: 36,
            ships: [5, 5, 15, 15, 20],
            loans: 0
        }
        expect(finalScore(brigit, [10, 15])).toBe(126)
    })

    it('doubles the 10/2 ships to 20 and the 15/3 ships to 30', () => {
        const player = { playerId: 'x', treasure: 0, ships: [10, 15], loans: 0 }
        expect(finalScore(player, [10, 15])).toBe(20 + 30)
        expect(finalScore(player, [])).toBe(25)
    })

    it('reaches 126 at the real end of a game', () => {
        const start = scenario({ numPlayers: 3, hands: { p1: ['A1'] } })
        const prepared = withState(start, (state) => {
            const brigit = state.getPlayerState('p1')
            brigit.treasure = 36
            brigit.ships = [5, 5, 15, 15, 20]
            state.removedDoublings = [10, 15]
            state.seaPile.items = []
            state.seaPile.remaining = 0
            state.dutchmanPile.items = []
            state.dutchmanPile.remaining = 0
        })
        const done = playSea(prepared, 'A1')
        expect(done.state.endReason).toBe(EndReason.DrawPilesEmpty)
        expect(FreibeuterRuntime.scoring.finalScores(done.state).p1).toBe(126)
        expect(done.state.winningPlayerIds).toEqual(['p1'])
    })

    it('keeps captured ships that were never surrounded out of the score', () => {
        const start = scenario({
            numPlayers: 3,
            counters: [{ intersection: 'AB12', kind: CounterKind.Ship, value: 20 }]
        })
        const captured = captureShip(start, 'AB12')
        expect(finalScore(captured.state.players[0], [])).toBe(20)
    })
})
