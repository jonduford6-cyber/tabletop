import { GameSession } from '@tabletop/frontend-components'
import {
    ActionType,
    CaptureShip,
    CounterKind,
    DrawCard,
    MachineState,
    PlayDutchmanCard,
    PlaySeaCard,
    ResolveEntity,
    board,
    dutchmanOptions,
    type Card,
    type FreibeuterProjectedState,
    type HydratedFreibeuterGameState,
    type Pile
} from '@tabletop/freibeuter'
import {
    cardKey,
    hasManualFreibeuterSelection,
    parseCardKey,
    popFreibeuterSelection,
    setFreibeuterSelection,
    type FreibeuterSelection
} from '../model/stagedSelection.js'
import { cardLabel } from '../utils/actionDescriptions.js'

export type TargetStatus = { legal: boolean; reason?: string }

const NO_TARGET: TargetStatus = { legal: false }

export class FreibeuterGameSession extends GameSession<
    FreibeuterProjectedState,
    HydratedFreibeuterGameState
> {
    private selection: FreibeuterSelection = $state({})
    inspectionMessage: string | undefined = $state()

    get machineState(): MachineState {
        return this.gameState.machineState
    }

    get viewerId(): string | undefined {
        return this.myPlayer?.id
    }

    get canActOnBoard(): boolean {
        return this.isMyTurn && this.isPlayable && !this.isViewingHistory && !this.busy
    }

    get isChoosingTurnAction(): boolean {
        return this.canActOnBoard && this.machineState === MachineState.StartOfTurn
    }

    get isResolving(): boolean {
        return this.canActOnBoard && this.machineState === MachineState.ResolvingEntities
    }

    get isDrawing(): boolean {
        return this.canActOnBoard && this.machineState === MachineState.Drawing
    }

    get hasManualSelection(): boolean {
        return hasManualFreibeuterSelection(this.selection)
    }

    get myHand(): Card[] {
        const playerId = this.viewerId
        if (!playerId) return []
        const hand = this.gameState.getPlayerState(playerId).hand
        const order = (card: Card) =>
            card.type === 'sea'
                ? `0${card.target}`
                : `1${card.target.replace('row:', 'a').replace('col:', 'b')}`
        return hand.toSorted((a, b) => order(a).localeCompare(order(b)))
    }

    cardProblem(card: Card): string | undefined {
        const playerId = this.viewerId
        if (!playerId) return 'You are not a player in this game'
        const player = this.gameState.getPlayerState(playerId)
        if (card.type === 'sea') {
            return player.placeableBoats > 0 ? undefined : 'You have no boat that you may place'
        }
        const options = dutchmanOptions(this.gameState, playerId).filter(
            (option) => option.card === card.target
        )
        return options.length > 0
            ? undefined
            : `The Flying Dutchman on ${cardLabel('dutchman', card.target)} would not surround anything`
    }

    get selectedCard(): Card | undefined {
        const key = this.selection.card?.value
        if (!key || this.machineState !== MachineState.StartOfTurn) return undefined
        const { type, target } = parseCardKey(key)
        const held = this.myHand.find((card) => card.type === type && card.target === target)
        return held && this.cardProblem(held) === undefined ? held : undefined
    }

    get captureMode(): boolean {
        return (
            this.machineState === MachineState.StartOfTurn &&
            this.selection.action?.value === 'capture' &&
            this.validActionTypes.includes(ActionType.CaptureShip)
        )
    }

    get pendingOccupiedSpace(): string | undefined {
        const space = this.selection.space?.value
        const card = this.selectedCard
        return card && card.type === 'sea' && card.target === space ? space : undefined
    }

    get legalSpaces(): string[] {
        const card = this.selectedCard
        const playerId = this.viewerId
        if (!card || !playerId) return []
        if (card.type === 'sea') return [card.target]
        return dutchmanOptions(this.gameState, playerId)
            .filter((option) => option.card === card.target)
            .map((option) => option.space)
    }

    isOccupied(space: string): boolean {
        return this.gameState.hasBoat(space)
    }

    spaceStatus(space: string): TargetStatus {
        const card = this.selectedCard
        if (!card || !this.isChoosingTurnAction) return NO_TARGET
        if (card.type === 'sea') {
            return space === card.target
                ? { legal: true }
                : { legal: false, reason: `Your card ${card.target} names another space` }
        }
        if (!board.spacesOfLine(card.target).includes(space)) {
            return {
                legal: false,
                reason: `The card ${cardLabel('dutchman', card.target)} only allows that line`
            }
        }
        return this.legalSpaces.includes(space)
            ? { legal: true }
            : { legal: false, reason: 'The Flying Dutchman there would not surround anything' }
    }

    counterStatus(intersection: string): TargetStatus {
        const counter = this.gameState.counterAt(intersection)
        if (!counter) return NO_TARGET
        if (this.isResolving) {
            return this.gameState.surrounded.includes(intersection)
                ? { legal: true }
                : { legal: false, reason: 'That entity is not surrounded' }
        }
        if (!this.captureMode || !this.isChoosingTurnAction) return NO_TARGET
        if (counter.kind !== CounterKind.Ship) {
            return { legal: false, reason: 'Only a ship can be captured' }
        }
        return counter.captorId === undefined
            ? { legal: true }
            : { legal: false, reason: 'That ship has already been captured' }
    }

    get captureReason(): string | undefined {
        if (this.validActionTypes.includes(ActionType.CaptureShip) || !this.viewerId) {
            return undefined
        }
        const player = this.gameState.getPlayerState(this.viewerId)
        if (player.placeableBoats <= 0) return 'You have no boat that you may place'
        return 'No uncaptured ship is left'
    }

    get drawChoices(): Pile[] {
        const playerId = this.viewerId
        return playerId ? this.gameState.drawChoices(playerId) : []
    }

    chooseCapture() {
        this.inspectionMessage = undefined
        this.selection = setFreibeuterSelection(this.selection, 'action', 'capture')
    }

    chooseCard(card: Card) {
        const problem = this.cardProblem(card)
        if (problem) {
            this.inspectionMessage = problem
            return
        }
        this.inspectionMessage = undefined
        const cleared = setFreibeuterSelection(this.selection, 'action', undefined)
        this.selection = setFreibeuterSelection(cleared, 'card', cardKey(card.type, card.target))
    }

    override async undo() {
        if (this.hasManualSelection) {
            this.inspectionMessage = undefined
            this.selection = popFreibeuterSelection(this.selection)
            return
        }
        await super.undo()
    }

    override beforeNewState() {
        this.selection = {}
        this.inspectionMessage = undefined
    }

    async clickCounter(intersection: string) {
        if (!this.canActOnBoard) return
        const status = this.counterStatus(intersection)
        if (!status.legal) {
            if (status.reason) this.inspectionMessage = status.reason
            return
        }
        if (this.isResolving) {
            await this.applyAction(this.createPlayerAction(ResolveEntity, { intersection }))
            return
        }
        await this.applyAction(this.createPlayerAction(CaptureShip, { intersection }))
    }

    async clickSpace(space: string) {
        if (!this.isChoosingTurnAction) return
        const card = this.selectedCard
        if (!card) {
            this.inspectionMessage = 'Click a card in your hand first'
            return
        }
        const status = this.spaceStatus(space)
        if (!status.legal) {
            this.inspectionMessage = status.reason
            return
        }
        this.inspectionMessage = undefined
        if (card.type === 'dutchman') {
            await this.applyAction(
                this.createPlayerAction(PlayDutchmanCard, { card: card.target, space })
            )
            return
        }
        if (this.isOccupied(space)) {
            this.selection = setFreibeuterSelection(this.selection, 'space', space)
            return
        }
        await this.applyAction(this.createPlayerAction(PlaySeaCard, { space }))
    }

    async playOccupied(takeTreasure: boolean) {
        const space = this.pendingOccupiedSpace
        if (!this.isChoosingTurnAction || !space) return
        await this.applyAction(this.createPlayerAction(PlaySeaCard, { space, takeTreasure }))
    }

    async drawFrom(pile: Pile) {
        if (!this.isDrawing) return
        if (!this.drawChoices.includes(pile)) {
            this.inspectionMessage = this.pileReason(pile)
            return
        }
        await this.applyAction(this.createPlayerAction(DrawCard, { pile }))
    }

    pileReason(pile: Pile): string | undefined {
        if (this.drawChoices.includes(pile)) return undefined
        const state = this.gameState
        const pileState = pile === 'sea' ? state.seaPile : state.dutchmanPile
        if (pileState.remaining === 0) return 'That pile is empty'
        return 'You have no sea card left, so you must draw a sea card'
    }
}
