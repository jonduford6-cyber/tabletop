import { assert, shuffle, type ExplorationPopulation, type GameExploration } from '@tabletop/common'
import {
    HydratedDolmengotterGameState,
    type DolmengotterProjectedState
} from '../model/gameState.js'
import { dolmenValuesFor } from './setup.js'

export class DolmengotterGameExploration implements GameExploration<DolmengotterProjectedState> {
    createFromCanonicalState(state: DolmengotterProjectedState): DolmengotterProjectedState {
        return new HydratedDolmengotterGameState(structuredClone(state)).dehydrate()
    }

    createFromProjectedState({
        state,
        perspective,
        random
    }: ExplorationPopulation<DolmengotterProjectedState>): DolmengotterProjectedState {
        const sample = new HydratedDolmengotterGameState(structuredClone(state))
        const knownPlayerId = perspective.kind === 'player' ? perspective.playerId : undefined
        const everyValue = dolmenValuesFor(sample.players.length)

        for (const player of sample.players) {
            if (player.playerId === knownPlayerId) continue
            const batchEntries = sample.circles.flatMap((circle) =>
                circle.batch.filter((entry) => entry.playerId === player.playerId)
            )
            const hiddenEntries = batchEntries.filter((entry) => entry.value === undefined)
            const stockHidden = player.dolmens.length < player.dolmenCount
            if (hiddenEntries.length === 0 && !stockHidden) continue

            const unseen = [...everyValue]
            for (const value of [
                ...player.scoredValues,
                ...batchEntries.flatMap((entry) =>
                    entry.value === undefined ? [] : [entry.value]
                ),
                ...player.dolmens
            ]) {
                const index = unseen.indexOf(value)
                assert(index >= 0, `Dolmen value ${value} is not in the dolmen population`)
                unseen.splice(index, 1)
            }
            const stockMissing = player.dolmenCount - player.dolmens.length
            assert(
                unseen.length === hiddenEntries.length + stockMissing,
                'Exploration dolmen count does not match the source'
            )
            shuffle(unseen, random)
            for (const entry of hiddenEntries) entry.value = unseen.pop()
            player.dolmens = [...player.dolmens, ...unseen].sort((a, b) => b - a)
        }
        return sample.dehydrate()
    }
}
