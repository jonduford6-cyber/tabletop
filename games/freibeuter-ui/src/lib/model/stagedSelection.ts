import {
    clearStagedSelectionAtOrAfter,
    hasManualStagedSelection,
    popHighestManualStagedSelection,
    setStagedSelectionValue,
    type StagedSelectionState
} from '@tabletop/frontend-components'

export type FreibeuterSelectionValues = {
    action: 'capture'
    card: string
    space: string
}

export type FreibeuterSelection = StagedSelectionState<FreibeuterSelectionValues>

export const FreibeuterStageOrder = [
    'action',
    'card',
    'space'
] as const satisfies readonly (keyof FreibeuterSelectionValues)[]
type MissingStages = Exclude<keyof FreibeuterSelectionValues, (typeof FreibeuterStageOrder)[number]>
const stageCoverage: MissingStages extends never ? true : never = true
void stageCoverage

export function setFreibeuterSelection<TStage extends keyof FreibeuterSelectionValues>(
    selection: FreibeuterSelection,
    stage: TStage,
    value: FreibeuterSelectionValues[TStage] | undefined
): FreibeuterSelection {
    return value === undefined
        ? clearStagedSelectionAtOrAfter<FreibeuterSelectionValues, TStage>(
              selection,
              FreibeuterStageOrder,
              stage
          )
        : setStagedSelectionValue<FreibeuterSelectionValues, TStage>(
              selection,
              FreibeuterStageOrder,
              stage,
              value,
              'manual'
          )
}

export function hasManualFreibeuterSelection(selection: FreibeuterSelection): boolean {
    return hasManualStagedSelection<FreibeuterSelectionValues>(selection, FreibeuterStageOrder)
}

export function popFreibeuterSelection(selection: FreibeuterSelection): FreibeuterSelection {
    return popHighestManualStagedSelection<FreibeuterSelectionValues>(
        selection,
        FreibeuterStageOrder
    ).nextState
}

export function cardKey(type: string, target: string): string {
    return `${type}|${target}`
}

export function parseCardKey(key: string): { type: string; target: string } {
    const [type, ...rest] = key.split('|')
    return { type, target: rest.join('|') }
}
