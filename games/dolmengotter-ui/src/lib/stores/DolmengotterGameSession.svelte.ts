import { GameSession } from '@tabletop/frontend-components'
import type { OffsetCoordinates } from '@tabletop/common'
import {
    ActionType,
    CollectHerbs,
    DeclineDolmen,
    DeclineStone,
    Flight,
    HydratedDeclineStone,
    MachineState,
    PlaceDolmen,
    PlaceDruid,
    PlaceStone,
    Walk,
    board,
    flightDestinations,
    placeKey,
    walkDestinations,
    type DolmengotterProjectedState,
    type HydratedDolmengotterGameState,
    type PendingDolmen
} from '@tabletop/dolmengotter'
import { flightProblem, placementProblem, walkProblem } from '../utils/moveProblems.js'
import { stockOf, type StockEntry } from '../utils/circleStacks.js'
import {
    hasManualDolmengotterSelection,
    popDolmengotterSelection,
    setDolmengotterSelection,
    type DolmengotterSelection,
    type TurnChoice
} from '../model/stagedSelection.js'

export type TargetStatus = { legal: boolean; reason?: string }

const NO_TARGET: TargetStatus = { legal: false }

const TURN_CHOICES: TurnChoice[] = [ActionType.Walk, ActionType.CollectHerbs, ActionType.Flight]

export class DolmengotterGameSession extends GameSession<
    DolmengotterProjectedState,
    HydratedDolmengotterGameState
> {
    private selection: DolmengotterSelection = $state({})
    inspectionMessage: string | undefined = $state()

    get machineState(): MachineState {
        return this.gameState.machineState
    }

    get canActOnBoard(): boolean {
        return this.isMyTurn && this.isPlayable && !this.isViewingHistory && !this.busy
    }

    get viewerId(): string | undefined {
        return this.myPlayer?.id
    }

    get isPlacingDruids(): boolean {
        return this.canActOnBoard && this.machineState === MachineState.PlacingDruids
    }

    get isChoosingTurnAction(): boolean {
        return this.canActOnBoard && this.machineState === MachineState.StartOfTurn
    }

    get isStoneDecision(): boolean {
        return this.canActOnBoard && this.machineState === MachineState.StoneDecision
    }

    get isDolmenDecision(): boolean {
        return this.canActOnBoard && this.machineState === MachineState.DolmenDecision
    }

    get turnPlayerId(): string | undefined {
        return this.gameState.turnManager.currentTurn()?.playerId
    }

    get chosenAction(): TurnChoice | undefined {
        const action = this.selection.action?.value
        const stillValid =
            this.machineState === MachineState.StartOfTurn &&
            action !== undefined &&
            this.validActionTypes.includes(action)
        return stillValid ? action : undefined
    }

    eligibleDruids(action: TurnChoice | undefined = this.chosenAction): OffsetCoordinates[] {
        const playerId = this.viewerId
        if (!action || !playerId) return []
        const state = this.gameState
        const druids = state.getPlayerState(playerId).druids
        switch (action) {
            case ActionType.Walk:
                return druids.filter(
                    (druid) => !druid.belly && walkDestinations(state.occupancy, druid).length > 0
                )
            case ActionType.CollectHerbs:
                return druids.filter((druid) => !druid.belly)
            default:
                return druids.filter(
                    (druid) => druid.belly && flightDestinations(state.occupancy, druid).length > 0
                )
        }
    }

    get chosenDruid(): OffsetCoordinates | undefined {
        const eligible = this.eligibleDruids()
        const manual = this.selection.druid?.value
        const manualDruid = eligible.find((druid) => placeKey(druid) === manual)
        if (manualDruid) return manualDruid
        return eligible.length === 1 ? eligible[0] : undefined
    }

    get destinations(): OffsetCoordinates[] {
        const druid = this.chosenDruid
        if (!druid) return []
        switch (this.chosenAction) {
            case ActionType.Walk:
                return walkDestinations(this.gameState.occupancy, druid)
            case ActionType.Flight:
                return flightDestinations(this.gameState.occupancy, druid)
            default:
                return []
        }
    }

    get hasManualSelection(): boolean {
        return hasManualDolmengotterSelection(this.selection)
    }

    chooseAction(action: TurnChoice | undefined) {
        this.inspectionMessage = undefined
        this.selection = setDolmengotterSelection(this.selection, 'action', action)
    }

    chooseDolmenValue(value: number | undefined) {
        this.inspectionMessage = undefined
        this.selection = setDolmengotterSelection(this.selection, 'dolmenValue', value)
    }

    chooseCircle(circleId: number | undefined) {
        this.inspectionMessage = undefined
        this.selection = setDolmengotterSelection(this.selection, 'circleId', circleId)
    }

    override async undo() {
        if (this.hasManualSelection) {
            this.inspectionMessage = undefined
            this.selection = popDolmengotterSelection(this.selection)
            return
        }
        await super.undo()
    }

    override beforeNewState() {
        this.selection = {}
        this.inspectionMessage = undefined
    }

    placeStatus(place: OffsetCoordinates): TargetStatus {
        if (!this.canActOnBoard) return NO_TARGET
        if (this.machineState === MachineState.PlacingDruids) {
            const problem = placementProblem(this.gameState, place)
            return { legal: problem === undefined, reason: problem }
        }
        const druid = this.chosenDruid
        if (this.machineState !== MachineState.StartOfTurn || !druid) return NO_TARGET
        if (this.chosenAction === ActionType.Walk) {
            const problem = walkProblem(this.gameState, druid, place)
            return { legal: problem === undefined, reason: problem }
        }
        if (this.chosenAction === ActionType.Flight) {
            const problem = flightProblem(this.gameState, druid, place)
            return { legal: problem === undefined, reason: problem }
        }
        return NO_TARGET
    }

    isEligibleDruid(place: OffsetCoordinates): boolean {
        return this.eligibleDruids().some((druid) => placeKey(druid) === placeKey(place))
    }

    isChosenDruid(place: OffsetCoordinates): boolean {
        const druid = this.chosenDruid
        return druid !== undefined && placeKey(druid) === placeKey(place)
    }

    get canClickBoard(): boolean {
        return (
            this.isPlacingDruids || (this.isChoosingTurnAction && this.chosenAction !== undefined)
        )
    }

    unavailableReason(action: TurnChoice): string | undefined {
        if (this.validActionTypes.includes(action) || !this.myPlayer) return undefined
        const druids = this.gameState.getPlayerState(this.myPlayer.id).druids
        switch (action) {
            case ActionType.Walk:
                return druids.every((druid) => druid.belly)
                    ? 'All your druids lie on their belly, so they can only fly'
                    : 'None of your upright druids has a free place to walk to'
            case ActionType.CollectHerbs:
                return 'All your druids already lie on their belly'
            default:
                return druids.some((druid) => druid.belly)
                    ? 'No stone place is free to land on'
                    : 'No druid lies on its belly: collect herbs with a druid first'
        }
    }

    get turnChoices(): TurnChoice[] {
        return TURN_CHOICES
    }

    nameForActionType(actionType: string) {
        switch (actionType) {
            case ActionType.PlaceDruid:
                return 'Place druid'
            case ActionType.Walk:
                return 'Walk'
            case ActionType.CollectHerbs:
                return 'Collect herbs'
            case ActionType.Flight:
                return 'Flight'
            case ActionType.PlaceStone:
                return 'Place a stone'
            case ActionType.DeclineStone:
                return 'Decline the stone'
            case ActionType.PlaceDolmen:
                return 'Place dolmen'
            case ActionType.DeclineDolmen:
                return 'Decline the dolmen'
            default:
                return actionType
        }
    }

    async clickPlace(place: OffsetCoordinates) {
        if (!this.canActOnBoard) return
        if (this.machineState === MachineState.PlacingDruids) {
            const status = this.placeStatus(place)
            if (!status.legal) {
                this.inspectionMessage = status.reason
                return
            }
            await this.applyAction(
                this.createPlayerAction(PlaceDruid, { row: place.row, col: place.col })
            )
            return
        }
        if (!this.isChoosingTurnAction || !this.chosenAction) return
        if (this.isEligibleDruid(place)) {
            this.inspectionMessage = undefined
            this.selection = setDolmengotterSelection(this.selection, 'druid', placeKey(place))
            return
        }
        const druid = this.chosenDruid
        if (!druid) {
            this.inspectionMessage =
                this.chosenAction === ActionType.Walk
                    ? 'Click one of your upright druids first'
                    : this.chosenAction === ActionType.Flight
                      ? 'Click one of your druids lying on its belly first'
                      : 'Click the druid that collects the herbs'
            return
        }
        if (this.chosenAction === ActionType.CollectHerbs) {
            this.inspectionMessage = 'Collect herbs with the button above, or pick another druid'
            return
        }
        const status = this.placeStatus(place)
        if (!status.legal) {
            this.inspectionMessage = status.reason
            return
        }
        const move = {
            fromRow: druid.row,
            fromCol: druid.col,
            toRow: place.row,
            toCol: place.col
        }
        await this.applyAction(
            this.chosenAction === ActionType.Walk
                ? this.createPlayerAction(Walk, move)
                : this.createPlayerAction(Flight, move)
        )
    }

    async collectHerbs() {
        const druid = this.chosenDruid
        if (!this.canActOnBoard || this.chosenAction !== ActionType.CollectHerbs) return
        if (!druid) {
            this.inspectionMessage = 'Click the druid that collects the herbs'
            return
        }
        await this.applyAction(
            this.createPlayerAction(CollectHerbs, { row: druid.row, col: druid.col })
        )
    }

    get vacatedPlace(): OffsetCoordinates | undefined {
        return this.gameState.vacatedPlace
    }

    get declineStoneProblem(): string | undefined {
        const playerId = this.viewerId
        if (!playerId) return undefined
        return HydratedDeclineStone.canDecline(this.gameState, playerId)
            ? undefined
            : 'Your marker is already on field 1, so you must place the stone'
    }

    get myPoints(): number | undefined {
        const playerId = this.viewerId
        return playerId ? this.gameState.getPlayerState(playerId).points : undefined
    }

    get declineStoneCost(): string | undefined {
        const points = this.myPoints
        return points === undefined || this.declineStoneProblem
            ? undefined
            : `Declining moves your marker back from ${points} to ${points - 1}`
    }

    async placeStone() {
        if (!this.isStoneDecision) return
        await this.applyAction(this.createPlayerAction(PlaceStone))
    }

    async declineStone() {
        if (!this.isStoneDecision) return
        if (this.declineStoneProblem) {
            this.inspectionMessage = this.declineStoneProblem
            return
        }
        await this.applyAction(this.createPlayerAction(DeclineStone))
    }

    get myDolmenRights(): PendingDolmen[] {
        const playerId = this.viewerId
        if (!this.isDolmenDecision || !playerId) return []
        return this.gameState.pendingDolmens.filter((right) => right.playerId === playerId)
    }

    get chosenCircleId(): number | undefined {
        const rights = this.myDolmenRights
        const manual = this.selection.circleId?.value
        if (manual !== undefined && rights.some((right) => right.circleId === manual)) return manual
        return rights.length === 1 ? rights[0].circleId : undefined
    }

    get chosenRight(): PendingDolmen | undefined {
        return this.myDolmenRights.find((right) => right.circleId === this.chosenCircleId)
    }

    get myStock(): StockEntry[] {
        const playerId = this.viewerId
        return playerId ? (stockOf(this.gameState, playerId, playerId) ?? []) : []
    }

    get chosenDolmenValue(): number | undefined {
        const stock = this.myStock
        const manual = this.selection.dolmenValue?.value
        if (manual !== undefined && stock.some((entry) => entry.value === manual)) return manual
        return stock.length === 1 ? stock[0].value : undefined
    }

    get placeDolmenProblem(): string | undefined {
        if (this.chosenCircleId === undefined) return 'Choose the circle first'
        if (this.chosenDolmenValue === undefined) return 'Choose which of your dolmens to place'
        return undefined
    }

    clickCircle(circleId: number) {
        if (!this.isDolmenDecision) return
        if (!this.myDolmenRights.some((right) => right.circleId === circleId)) {
            this.inspectionMessage = 'You have no dolmen decision in that circle'
            return
        }
        this.chooseCircle(circleId)
    }

    async placeDolmen() {
        if (!this.isDolmenDecision) return
        const circleId = this.chosenCircleId
        const value = this.chosenDolmenValue
        if (circleId === undefined || value === undefined) {
            this.inspectionMessage = this.placeDolmenProblem
            return
        }
        await this.applyAction(this.createPlayerAction(PlaceDolmen, { circleId, value }))
    }

    async declineDolmen() {
        if (!this.isDolmenDecision) return
        const circleId = this.chosenCircleId
        if (circleId === undefined) {
            this.inspectionMessage = 'Choose the circle first'
            return
        }
        await this.applyAction(this.createPlayerAction(DeclineDolmen, { circleId }))
    }

    circleName(circleId: number): string {
        const circle = board.circle(circleId)
        const shape =
            circle.shape === 'tetragonal'
                ? 'square'
                : circle.shape === 'hexagonal'
                  ? 'hexagon'
                  : 'octagon'
        return `${shape} #${circleId + 1}`
    }

    spotLabel(place: OffsetCoordinates): string {
        return `(${place.row},${place.col})`
    }
}
