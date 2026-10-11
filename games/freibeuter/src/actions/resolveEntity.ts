import * as Type from 'typebox'
import { Compile } from 'typebox/compile'
import {
    GameAction,
    HydratableAction,
    assert,
    assertExists,
    type MachineContext
} from '@tabletop/common'
import { ActionType } from '../definition/actions.js'
import { CHEST_PAYMENT, shipPayment } from '../definition/setup.js'
import { board } from '../components/board.js'
import { CounterKind, type HydratedFreibeuterGameState } from '../model/gameState.js'

export type Payment = Type.Static<typeof Payment>
export const Payment = Type.Object({ playerId: Type.String(), amount: Type.Number() })

export type ResolveEntityMetadata = Type.Static<typeof ResolveEntityMetadata>
export const ResolveEntityMetadata = Type.Object({
    kind: Type.Enum(CounterKind),
    value: Type.Optional(Type.Number()),
    captorId: Type.Optional(Type.String()),
    payments: Type.Array(Payment),
    loan: Type.Number()
})

export type ResolveEntity = Type.Static<typeof ResolveEntity>
export const ResolveEntity = Type.Evaluate(
    Type.Intersect([
        GameAction,
        Type.Object({
            type: Type.Literal(ActionType.ResolveEntity),
            intersection: Type.String(),
            metadata: Type.Optional(ResolveEntityMetadata)
        })
    ])
)

export const ResolveEntityValidator = Compile(ResolveEntity)

export function isResolveEntity(action?: GameAction): action is ResolveEntity {
    return action?.type === ActionType.ResolveEntity
}

export class HydratedResolveEntity
    extends HydratableAction<typeof ResolveEntity>
    implements ResolveEntity
{
    declare type: ActionType.ResolveEntity
    declare intersection: string
    declare metadata?: ResolveEntityMetadata

    constructor(data: ResolveEntity) {
        super(data, ResolveEntityValidator)
    }

    apply(state: HydratedFreibeuterGameState, _context?: MachineContext) {
        assert(
            state.surrounded.includes(this.intersection),
            'That entity is not waiting to be resolved'
        )
        const counter = state.counterAt(this.intersection)
        assertExists(counter, 'There is no counter on that intersection')
        state.counters = state.counters.filter((other) => other !== counter)
        state.surrounded = state.surrounded.filter((id) => id !== this.intersection)

        const around = board.intersection(this.intersection).spaces
        const boats = state.placedBoats.filter((boat) => around.includes(boat.space))
        const metadata: ResolveEntityMetadata = {
            kind: counter.kind,
            value: counter.value,
            captorId: counter.captorId,
            payments: [],
            loan: 0
        }

        if (counter.kind === CounterKind.Doubling) {
            assertExists(counter.value, 'A doubling counter has a value')
            state.removedDoublings.push(counter.value)
        } else if (counter.kind === CounterKind.Chest) {
            state.removedChests += 1
            for (const player of state.players) {
                if (boats.some((boat) => boat.playerId === player.playerId)) {
                    player.treasure += CHEST_PAYMENT
                    metadata.payments.push({ playerId: player.playerId, amount: CHEST_PAYMENT })
                }
            }
        } else if (counter.captorId !== undefined) {
            assertExists(counter.value, 'A ship has a value')
            const captor = state.getPlayerState(counter.captorId)
            captor.boats += 1
            captor.ships.push(counter.value)
            const owed = state.players
                .filter((player) => player.playerId !== captor.playerId)
                .map((player) => ({
                    player,
                    amount:
                        boats.filter((boat) => boat.playerId === player.playerId).length *
                        shipPayment(counter.value ?? 0)
                }))
                .filter((debt) => debt.amount > 0)
            const total = owed.reduce((sum, debt) => sum + debt.amount, 0)
            const shortfall = Math.max(0, total - captor.treasure)
            captor.loans += shortfall
            captor.treasure += shortfall
            captor.treasure -= total
            for (const debt of owed) {
                debt.player.treasure += debt.amount
                metadata.payments.push({ playerId: debt.player.playerId, amount: debt.amount })
            }
            metadata.loan = shortfall
        }
        this.metadata = metadata
    }
}
