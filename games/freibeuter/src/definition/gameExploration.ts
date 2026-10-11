import { assert, shuffle, type ExplorationPopulation, type GameExploration } from '@tabletop/common'
import {
    allDutchmanCards,
    allSeaCards,
    CardType,
    removeOne,
    type Card
} from '../components/cards.js'
import { HydratedFreibeuterGameState, type FreibeuterProjectedState } from '../model/gameState.js'

export class FreibeuterGameExploration implements GameExploration<FreibeuterProjectedState> {
    createFromCanonicalState(state: FreibeuterProjectedState): FreibeuterProjectedState {
        return new HydratedFreibeuterGameState(structuredClone(state)).dehydrate()
    }

    createFromProjectedState({
        state,
        perspective,
        random
    }: ExplorationPopulation<FreibeuterProjectedState>): FreibeuterProjectedState {
        const sample = new HydratedFreibeuterGameState(structuredClone(state))
        const knownPlayerId = perspective.kind === 'player' ? perspective.playerId : undefined

        const unseen: Record<CardType, Card[]> = {
            [CardType.Sea]: allSeaCards(),
            [CardType.Dutchman]: allDutchmanCards()
        }
        const discards = [...sample.seaDiscard, ...sample.dutchmanDiscard]
        const known = [
            ...discards,
            ...sample.players
                .filter((player) => player.playerId === knownPlayerId)
                .flatMap((player) => player.hand)
        ]
        for (const card of known) {
            assert(removeOne(unseen[card.type], card), 'A known card is not in the card population')
        }
        shuffle(unseen[CardType.Sea], random)
        shuffle(unseen[CardType.Dutchman], random)

        for (const player of sample.players) {
            if (player.playerId === knownPlayerId) continue
            player.hand = [
                ...unseen[CardType.Sea].splice(0, player.seaCount),
                ...unseen[CardType.Dutchman].splice(0, player.dutchmanCount)
            ]
        }
        assert(
            unseen[CardType.Sea].length === sample.seaPile.remaining &&
                unseen[CardType.Dutchman].length === sample.dutchmanPile.remaining,
            'Exploration card count does not match the source'
        )
        sample.seaPile.items = unseen[CardType.Sea]
        sample.dutchmanPile.items = unseen[CardType.Dutchman]
        return sample.dehydrate()
    }
}
