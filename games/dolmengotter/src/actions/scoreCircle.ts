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
import { board } from '../components/board.js'
import { FACTORS_TOP_DOWN } from '../definition/setup.js'
import type { HydratedDolmengotterGameState } from '../model/gameState.js'

export type ScoredDolmen = Type.Static<typeof ScoredDolmen>
export const ScoredDolmen = Type.Object({
    playerId: Type.String(),
    value: Type.Number(),
    factor: Type.Number(),
    points: Type.Number()
})

export type ScoreCircleMetadata = Type.Static<typeof ScoreCircleMetadata>
export const ScoreCircleMetadata = Type.Object({
    dolmens: Type.Array(ScoredDolmen)
})

export type ScoreCircle = Type.Static<typeof ScoreCircle>
export const ScoreCircle = Type.Evaluate(
    Type.Intersect([
        GameAction,
        Type.Object({
            type: Type.Literal(ActionType.ScoreCircle),
            circleId: Type.Number(),
            metadata: Type.Optional(ScoreCircleMetadata)
        })
    ])
)

export const ScoreCircleValidator = Compile(ScoreCircle)

export function isScoreCircle(action?: GameAction): action is ScoreCircle {
    return action?.type === ActionType.ScoreCircle
}

export class HydratedScoreCircle
    extends HydratableAction<typeof ScoreCircle>
    implements ScoreCircle
{
    declare type: ActionType.ScoreCircle
    declare circleId: number
    declare metadata?: ScoreCircleMetadata

    constructor(data: ScoreCircle) {
        super(data, ScoreCircleValidator)
    }

    apply(state: HydratedDolmengotterGameState, _context?: MachineContext) {
        assert(
            state.circlesToScore[0] === this.circleId,
            'That circle is not the next one to score'
        )
        const factors = FACTORS_TOP_DOWN[board.circle(this.circleId).shape]
        const circle = state.circles[this.circleId]
        const dolmens = circle.batch.map((entry, index) => {
            assertExists(entry.value, 'A dolmen value is hidden in this representation')
            const factor = factors[index]
            assertExists(factor, 'The batch is higher than the circle allows')
            return {
                playerId: entry.playerId,
                value: entry.value,
                factor,
                points: entry.value * factor
            }
        })
        for (const dolmen of dolmens) {
            const player = state.getPlayerState(dolmen.playerId)
            player.points += dolmen.points
            player.scoredValues.push(dolmen.value)
        }
        circle.batch = []
        state.circlesToScore.shift()
        this.revealsInfo = true
        this.metadata = { dolmens }
    }
}
