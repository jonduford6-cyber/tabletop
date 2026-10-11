import type { HydratedAction, MachineContext, MachineStateHandler } from '@tabletop/common'
import { ActionType } from '../definition/actions.js'
import { MachineState } from '../definition/states.js'
import { ScoreCircle } from '../actions/scoreCircle.js'
import type { HydratedDolmengotterGameState } from '../model/gameState.js'
import { finishTurn } from '../util/turnFlow.js'

export class ScoringStateHandler implements MachineStateHandler<
    HydratedAction,
    HydratedDolmengotterGameState
> {
    isValidAction(
        action: HydratedAction,
        _context: MachineContext<HydratedDolmengotterGameState>
    ): boolean {
        return action.type === ActionType.ScoreCircle
    }

    validActionsForPlayer(
        _playerId: string,
        _context: MachineContext<HydratedDolmengotterGameState>
    ): string[] {
        return []
    }

    enter(context: MachineContext<HydratedDolmengotterGameState>) {
        const [circleId] = context.gameState.circlesToScore
        if (circleId !== undefined) context.addSystemAction(ScoreCircle, { circleId })
    }

    onAction(
        _action: HydratedAction,
        context: MachineContext<HydratedDolmengotterGameState>
    ): MachineState {
        const state = context.gameState
        if (state.circlesToScore.length > 0) return MachineState.Scoring
        return state.ending ? MachineState.EndOfGame : finishTurn(state)
    }
}
