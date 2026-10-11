import type { GameAction } from '@tabletop/common'
import {
    CounterKind,
    EndReason,
    Pile,
    board,
    isCaptureShip,
    isDrawCard,
    isEndGame,
    isPass,
    isPlayDutchmanCard,
    isPlaySeaCard,
    isResolveEntity
} from '@tabletop/freibeuter'
import { shipLabel } from './boardGeometry.js'

export function cardLabel(type: string, target: string): string {
    if (type === 'sea') return target
    return target.startsWith('row:') ? `row ${target.slice(4)}` : `column ${target.slice(4)}`
}

export function endReasonText(reason: EndReason | undefined): string {
    switch (reason) {
        case EndReason.LastChest:
            return 'The last pirate chest was surrounded and paid.'
        case EndReason.DrawPilesEmpty:
            return 'A player had to draw a card and both draw piles were empty.'
        case EndReason.NoBoats:
            return 'A player had no boat left that he may place at the start of his turn.'
        case EndReason.AllPassed:
            return 'No player had a legal action.'
        default:
            return ''
    }
}

function entityName(kind: CounterKind, value?: number): string {
    switch (kind) {
        case CounterKind.Ship:
            return `ship ${shipLabel(value ?? 0)}`
        case CounterKind.Chest:
            return 'pirate chest'
        default:
            return `doubling counter x2 (${value})`
    }
}

export function describeAction(
    action: GameAction,
    nameOf: (playerId?: string) => string = (id) => id ?? ''
): string {
    switch (true) {
        case isCaptureShip(action):
            return `captured the ship at ${action.intersection}`
        case isPlaySeaCard(action):
            return action.takeTreasure
                ? `played ${action.space} and took 2 treasure`
                : `placed a boat on ${action.space}`
        case isPlayDutchmanCard(action):
            return `placed the Flying Dutchman on ${action.space} (${cardLabel('dutchman', action.card)})`
        case isResolveEntity(action): {
            const data = action.metadata
            if (!data) return `resolved the entity at ${action.intersection}`
            const what = entityName(data.kind, data.value)
            if (data.kind === CounterKind.Ship && data.captorId === undefined) {
                return `surrounded an uncaptured ${what}; it was removed and nobody was paid`
            }
            const payments = data.payments
                .map((payment) => `${nameOf(payment.playerId)} ${payment.amount}`)
                .join(', ')
            if (data.kind === CounterKind.Ship) {
                const loan = data.loan > 0 ? `; ${nameOf(data.captorId)} borrowed ${data.loan}` : ''
                return `${nameOf(data.captorId)} took the ${what}${payments ? `, paying ${payments}` : ''}${loan}`
            }
            if (data.kind === CounterKind.Chest) {
                return `surrounded the ${what}${payments ? `, paying ${payments} from the bank` : ''}`
            }
            return `surrounded the ${what}`
        }
        case isDrawCard(action): {
            const from = action.pile === Pile.Sea ? 'sea' : 'Flying Dutchman'
            const drawn = action.card ? ` (${cardLabel(action.card.type, action.card.target)})` : ''
            return `drew from the ${from} pile${drawn}`
        }
        case isPass(action):
            return 'had no legal action and passed'
        case isEndGame(action):
            return `ended the game: ${endReasonText(action.reason)}`
        default:
            return action.type
    }
}

export function describeSpace(space: string): string {
    return board.isOutside(space) ? `${space} (outside)` : `${space} (inside)`
}
