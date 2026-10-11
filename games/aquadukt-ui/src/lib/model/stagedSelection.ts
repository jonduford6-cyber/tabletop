import { ActionType } from '@tabletop/aquadukt'
import {
    clearStagedSelectionAtOrAfter,
    hasManualStagedSelection,
    popHighestManualStagedSelection,
    setStagedSelectionValue,
    type StagedSelectionState
} from '@tabletop/frontend-components'

export type AquaduktSelectionValues = {
    action: ActionType
    tileValue: number
}

export type AquaduktSelection = StagedSelectionState<AquaduktSelectionValues>

export const AquaduktStageOrder = [
    'action',
    'tileValue'
] as const satisfies readonly (keyof AquaduktSelectionValues)[]
type MissingStages = Exclude<keyof AquaduktSelectionValues, (typeof AquaduktStageOrder)[number]>
const stageCoverage: MissingStages extends never ? true : never = true
void stageCoverage

export function setAquaduktSelection<TStage extends keyof AquaduktSelectionValues>(
    selection: AquaduktSelection,
    stage: TStage,
    value: AquaduktSelectionValues[TStage] | undefined
): AquaduktSelection {
    return value === undefined
        ? clearStagedSelectionAtOrAfter<AquaduktSelectionValues, TStage>(
              selection,
              AquaduktStageOrder,
              stage
          )
        : setStagedSelectionValue<AquaduktSelectionValues, TStage>(
              selection,
              AquaduktStageOrder,
              stage,
              value,
              'manual'
          )
}

export function hasManualAquaduktSelection(selection: AquaduktSelection): boolean {
    return hasManualStagedSelection<AquaduktSelectionValues>(selection, AquaduktStageOrder)
}

export function popAquaduktSelection(selection: AquaduktSelection): AquaduktSelection {
    return popHighestManualStagedSelection<AquaduktSelectionValues>(selection, AquaduktStageOrder)
        .nextState
}
