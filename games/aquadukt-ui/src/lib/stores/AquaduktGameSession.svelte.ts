import { GameSession } from '@tabletop/frontend-components'
import type { OffsetCoordinates } from '@tabletop/common'
import {
    ActionType,
    Board,
    EndTurn,
    MachineState,
    PlaceCanal,
    PlaceHouse,
    PlaceSpring,
    RollDie,
    TILE_VALUES,
    canalPlacementProblem,
    springPlacementProblem,
    suppliedSquareKeys,
    type AquaduktGameState,
    type Edge,
    type HydratedAquaduktGameState
} from '@tabletop/aquadukt'
import { housePlacementProblem } from '../utils/housePlacementProblem.js'
import {
    hasManualAquaduktSelection,
    popAquaduktSelection,
    setAquaduktSelection,
    type AquaduktSelection
} from '../model/stagedSelection.js'

export type TargetStatus = { legal: boolean; reason?: string }

const NO_TARGET: TargetStatus = { legal: false }

export class AquaduktGameSession extends GameSession<AquaduktGameState, HydratedAquaduktGameState> {
    private selection: AquaduktSelection = $state({})
    inspectionMessage: string | undefined = $state()

    private get automaticAction(): ActionType | undefined {
        if (!this.isMyTurn) return undefined
        switch (this.gameState.machineState) {
            case MachineState.HouseRolled:
                return ActionType.PlaceHouse
            case MachineState.CanalPlaced:
                return ActionType.PlaceCanal
            default:
                return undefined
        }
    }

    private get manualAction(): ActionType | undefined {
        const action = this.selection.action?.value
        const stillValid =
            this.gameState.machineState === MachineState.StartOfTurn &&
            action !== undefined &&
            this.validActionTypes.includes(action)
        return stillValid ? action : undefined
    }

    get chosenAction(): ActionType | undefined {
        return this.manualAction ?? this.automaticAction
    }

    get tileValues(): number[] {
        if (this.chosenAction !== ActionType.PlaceHouse || !this.myPlayer) return []
        const playerState = this.gameState.getPlayerState(this.myPlayer.id)
        return TILE_VALUES.filter((value) => playerState.tilesLeft(value) > 0)
    }

    get chosenTileValue(): number | undefined {
        const available = this.tileValues
        const manual = this.selection.tileValue?.value
        if (manual !== undefined && available.includes(manual)) return manual
        return available.length === 1 ? available[0] : undefined
    }

    get hasManualSelection(): boolean {
        return hasManualAquaduktSelection(this.selection)
    }

    get canActOnBoard(): boolean {
        return this.isMyTurn && this.isPlayable && !this.isViewingHistory && !this.busy
    }

    get suppliedSquares(): Set<string> {
        return suppliedSquareKeys(this.gameState.canals)
    }

    squareStatus(square: OffsetCoordinates): TargetStatus {
        const playerId = this.myPlayer?.id
        if (this.chosenAction !== ActionType.PlaceHouse || !playerId) return NO_TARGET
        const rolledRegion = this.gameState.rolledRegion
        if (Board.regionOf(square) !== rolledRegion) {
            return {
                legal: false,
                reason: `Not in the rolled region (region ${rolledRegion})`
            }
        }
        const value = this.chosenTileValue
        if (value === undefined) return { legal: false, reason: 'Choose a tile value first' }
        const problem = housePlacementProblem(this.gameState, playerId, square, value)
        return { legal: problem === undefined, reason: problem }
    }

    intersectionStatus(point: OffsetCoordinates): TargetStatus {
        if (this.chosenAction !== ActionType.PlaceSpring) return NO_TARGET
        const problem = springPlacementProblem(this.gameState, point)
        return { legal: problem === undefined, reason: problem }
    }

    edgeStatus(edge: Edge): TargetStatus {
        if (this.chosenAction !== ActionType.PlaceCanal) return NO_TARGET
        const problem = canalPlacementProblem(this.gameState, edge)
        return { legal: problem === undefined, reason: problem }
    }

    chooseAction(action: ActionType | undefined) {
        this.inspectionMessage = undefined
        this.selection = setAquaduktSelection(this.selection, 'action', action)
    }

    chooseTileValue(value: number | undefined) {
        this.inspectionMessage = undefined
        this.selection = setAquaduktSelection(this.selection, 'tileValue', value)
    }

    override async undo() {
        if (this.hasManualSelection) {
            this.inspectionMessage = undefined
            this.selection = popAquaduktSelection(this.selection)
            return
        }
        await super.undo()
    }

    override beforeNewState() {
        this.selection = {}
        this.inspectionMessage = undefined
    }

    unavailableReason(action: ActionType): string | undefined {
        if (this.validActionTypes.includes(action) || !this.myPlayer) return undefined
        const state = this.gameState
        switch (action) {
            case ActionType.RollDie:
                return state.getPlayerState(this.myPlayer.id).totalTilesLeft() === 0
                    ? 'You have no house tiles left'
                    : 'No free squares are left on the board'
            case ActionType.PlaceSpring:
                return state.springsRemaining === 0
                    ? 'All 5 springs are already placed'
                    : 'No legal intersection is left'
            case ActionType.PlaceCanal:
                if (state.springs.length === 0) return 'Discover a spring first'
                return state.canalsRemaining === 0 ? 'No canals are left' : 'No legal edge is left'
            default:
                return undefined
        }
    }

    nameForActionType(actionType: string) {
        switch (actionType) {
            case ActionType.RollDie:
                return 'Roll die'
            case ActionType.PlaceHouse:
                return 'Place house'
            case ActionType.PlaceSpring:
                return 'Discover spring'
            case ActionType.PlaceCanal:
                return 'Build canals'
            case ActionType.EndTurn:
                return 'End turn'
            default:
                return actionType
        }
    }

    async rollDie() {
        await this.applyAction(this.createPlayerAction(RollDie))
    }

    async endTurn() {
        await this.applyAction(this.createPlayerAction(EndTurn))
    }

    async placeHouse(square: OffsetCoordinates) {
        const status = this.squareStatus(square)
        const value = this.chosenTileValue
        if (!this.canActOnBoard) return
        if (!status.legal || value === undefined) {
            this.inspectionMessage = status.reason
            return
        }
        await this.applyAction(
            this.createPlayerAction(PlaceHouse, { row: square.row, col: square.col, value })
        )
    }

    async placeSpring(point: OffsetCoordinates) {
        const status = this.intersectionStatus(point)
        if (!this.canActOnBoard) return
        if (!status.legal) {
            this.inspectionMessage = status.reason
            return
        }
        await this.applyAction(
            this.createPlayerAction(PlaceSpring, { row: point.row, col: point.col })
        )
    }

    async placeCanal(edge: Edge) {
        const status = this.edgeStatus(edge)
        if (!this.canActOnBoard) return
        if (!status.legal) {
            this.inspectionMessage = status.reason
            return
        }
        await this.applyAction(
            this.createPlayerAction(PlaceCanal, {
                orientation: edge.orientation,
                row: edge.row,
                col: edge.col
            })
        )
    }
}
