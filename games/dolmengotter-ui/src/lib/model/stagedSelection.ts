import { ActionType } from '@tabletop/dolmengotter'
import {
    clearStagedSelectionAtOrAfter,
    hasManualStagedSelection,
    popHighestManualStagedSelection,
    setStagedSelectionValue,
    type StagedSelectionState
} from '@tabletop/frontend-components'

export type TurnChoice = ActionType.Walk | ActionType.CollectHerbs | ActionType.Flight

export type DolmengotterSelectionValues = {
    action: TurnChoice
    druid: string
    circleId: number
    dolmenValue: number
}

export type DolmengotterSelection = StagedSelectionState<DolmengotterSelectionValues>

export const DolmengotterStageOrder = [
    'action',
    'druid',
    'circleId',
    'dolmenValue'
] as const satisfies readonly (keyof DolmengotterSelectionValues)[]
type MissingStages = Exclude<
    keyof DolmengotterSelectionValues,
    (typeof DolmengotterStageOrder)[number]
>
const stageCoverage: MissingStages extends never ? true : never = true
void stageCoverage

export function setDolmengotterSelection<TStage extends keyof DolmengotterSelectionValues>(
    selection: DolmengotterSelection,
    stage: TStage,
    value: DolmengotterSelectionValues[TStage] | undefined
): DolmengotterSelection {
    return value === undefined
        ? clearStagedSelectionAtOrAfter<DolmengotterSelectionValues, TStage>(
              selection,
              DolmengotterStageOrder,
              stage
          )
        : setStagedSelectionValue<DolmengotterSelectionValues, TStage>(
              selection,
              DolmengotterStageOrder,
              stage,
              value,
              'manual'
          )
}

export function hasManualDolmengotterSelection(selection: DolmengotterSelection): boolean {
    return hasManualStagedSelection<DolmengotterSelectionValues>(selection, DolmengotterStageOrder)
}

export function popDolmengotterSelection(selection: DolmengotterSelection): DolmengotterSelection {
    return popHighestManualStagedSelection<DolmengotterSelectionValues>(
        selection,
        DolmengotterStageOrder
    ).nextState
}
