import { createAction } from '@tabletop/common'
import {
    CaptureShip,
    CounterKind,
    DrawCard,
    EndGame,
    EndReason,
    Pile,
    PlayDutchmanCard,
    PlaySeaCard,
    ResolveEntity
} from '@tabletop/freibeuter'
import { describe, expect, it } from 'vitest'
import { describeAction } from './actionDescriptions.js'

const base = { gameId: 'g', playerId: 'p1' }
const names = (id?: string) => ({ p1: 'Brigit', p2: 'David', p3: 'Conrad' })[id ?? ''] ?? ''

describe('describeAction', () => {
    it('describes capturing and playing cards', () => {
        expect(
            describeAction(createAction(CaptureShip, { ...base, intersection: 'AB12' }), names)
        ).toBe('captured the ship at AB12')
        expect(describeAction(createAction(PlaySeaCard, { ...base, space: 'C4' }), names)).toBe(
            'placed a boat on C4'
        )
        expect(
            describeAction(
                createAction(PlaySeaCard, { ...base, space: 'C4', takeTreasure: true }),
                names
            )
        ).toBe('played C4 and took 2 treasure')
        expect(
            describeAction(
                createAction(PlayDutchmanCard, { ...base, card: 'row:B', space: 'B2' }),
                names
            )
        ).toBe('placed the Flying Dutchman on B2 (row B)')
    })

    it('shows the drawn card only to the drawer', () => {
        const drawn = createAction(DrawCard, { ...base, pile: Pile.Sea })
        expect(describeAction(drawn, names)).toBe('drew from the sea pile')
        const mine = { ...drawn, card: { type: 'sea' as const, target: 'E5' } }
        expect(describeAction(mine, names)).toBe('drew from the sea pile (E5)')
        const dutch = createAction(DrawCard, { ...base, pile: Pile.Dutchman })
        expect(describeAction(dutch, names)).toBe('drew from the Flying Dutchman pile')
    })

    it('describes the payments and the loan of a captured ship', () => {
        const action = createAction(ResolveEntity, {
            gameId: 'g',
            intersection: 'AB12',
            metadata: {
                kind: CounterKind.Ship,
                value: 15,
                captorId: 'p3',
                payments: [
                    { playerId: 'p1', amount: 6 },
                    { playerId: 'p2', amount: 3 }
                ],
                loan: 7
            }
        })
        expect(describeAction(action, names)).toBe(
            'Conrad took the ship 15/3, paying Brigit 6, David 3; Conrad borrowed 7'
        )
    })

    it('describes an uncaptured ship, a chest and a doubling counter', () => {
        const entity = (
            kind: CounterKind,
            value?: number,
            payments: { playerId: string; amount: number }[] = []
        ) =>
            createAction(ResolveEntity, {
                gameId: 'g',
                intersection: 'AB12',
                metadata: { kind, value, payments, loan: 0 }
            })
        expect(describeAction(entity(CounterKind.Ship, 20), names)).toMatch(/nobody was paid/)
        expect(
            describeAction(
                entity(CounterKind.Chest, undefined, [{ playerId: 'p1', amount: 2 }]),
                names
            )
        ).toBe('surrounded the pirate chest, paying Brigit 2 from the bank')
        expect(describeAction(entity(CounterKind.Doubling, 10), names)).toBe(
            'surrounded the doubling counter x2 (10)'
        )
    })

    it('gives the reason for the end of the game', () => {
        expect(
            describeAction(
                createAction(EndGame, { gameId: 'g', reason: EndReason.LastChest }),
                names
            )
        ).toMatch(/last pirate chest/)
    })
})
