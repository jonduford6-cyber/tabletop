import * as Type from 'typebox'
import { Compile } from 'typebox/compile'
import { GameAction, HydratableAction, assert, type MachineContext } from '@tabletop/common'
import { ActionType } from '../definition/actions.js'
import { MAX_HOUSES_PER_ROLL_ACTION, NUM_REGIONS } from '../definition/setup.js'
import type { HydratedAquaduktGameState } from '../model/gameState.js'

export type RollDieMetadata = Type.Static<typeof RollDieMetadata>
export const RollDieMetadata = Type.Object({
    region: Type.Number(),
    skippedFullRegions: Type.Array(Type.Number())
})

export type RollDie = Type.Static<typeof RollDie>
export const RollDie = Type.Evaluate(
    Type.Intersect([
        Type.Omit(GameAction, ['playerId']),
        Type.Object({
            type: Type.Literal(ActionType.RollDie),
            playerId: Type.String(),
            metadata: Type.Optional(RollDieMetadata)
        })
    ])
)

export const RollDieValidator = Compile(RollDie)

export function isRollDie(action?: GameAction): action is RollDie {
    return action?.type === ActionType.RollDie
}

export class HydratedRollDie extends HydratableAction<typeof RollDie> implements RollDie {
    declare type: ActionType.RollDie
    declare playerId: string
    declare metadata?: RollDieMetadata

    constructor(data: RollDie) {
        super(data, RollDieValidator)
    }

    apply(state: HydratedAquaduktGameState, _context?: MachineContext) {
        assert(
            HydratedRollDie.canRoll(state, this.playerId),
            'The player cannot roll for a house right now'
        )
        const prng = state.getPublicPrng()
        const skippedFullRegions: number[] = []
        let region = prng.dieRoll(NUM_REGIONS)
        while (state.isRegionFull(region)) {
            skippedFullRegions.push(region)
            region = prng.dieRoll(NUM_REGIONS)
        }
        state.rolledRegion = region
        this.metadata = { region, skippedFullRegions }
    }

    static canRoll(state: HydratedAquaduktGameState, playerId: string): boolean {
        return (
            state.housesPlacedThisTurn < MAX_HOUSES_PER_ROLL_ACTION &&
            state.getPlayerState(playerId).totalTilesLeft() > 0 &&
            state.hasRegionWithFreeSquare()
        )
    }
}
