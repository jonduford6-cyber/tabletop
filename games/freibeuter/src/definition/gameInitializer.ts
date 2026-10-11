import {
    BaseGameInitializer,
    HydratedTurnManager,
    Prng,
    assertExists,
    shuffle,
    type Game,
    type GameInitializer,
    type UninitializedGameState
} from '@tabletop/common'
import { board } from '../components/board.js'
import { HydratedCardPile } from '../components/cardPile.js'
import { allDutchmanCards, allSeaCards } from '../components/cards.js'
import {
    CounterKind,
    HydratedFreibeuterGameState,
    type Counter,
    type FreibeuterProjectedState
} from '../model/gameState.js'
import { HydratedFreibeuterPlayerState } from '../model/playerState.js'
import { FreibeuterColors } from './colors.js'
import {
    BOATS_PER_PLAYER,
    CHEST_COUNT,
    MAX_PLAYERS,
    MIN_PLAYERS,
    SHIPS_PER_VALUE,
    SHIP_VALUES,
    START_DUTCHMAN_CARDS,
    START_SEA_CARDS,
    START_TREASURE
} from './setup.js'
import { MachineState } from './states.js'

function shuffledCounters(random: () => number): Counter[] {
    const kinds: Omit<Counter, 'intersection'>[] = [
        ...SHIP_VALUES.flatMap((value) =>
            Array.from({ length: SHIPS_PER_VALUE }, () => ({ kind: CounterKind.Ship, value }))
        ),
        ...Array.from({ length: CHEST_COUNT }, () => ({ kind: CounterKind.Chest })),
        ...SHIP_VALUES.map((value) => ({ kind: CounterKind.Doubling, value }))
    ]
    shuffle(kinds, random)
    return board.intersections.map((intersection, index) => ({
        intersection: intersection.id,
        ...kinds[index]
    }))
}

export class FreibeuterGameInitializer
    extends BaseGameInitializer<FreibeuterProjectedState, HydratedFreibeuterGameState>
    implements GameInitializer<FreibeuterProjectedState, HydratedFreibeuterGameState>
{
    initializeGameState(game: Game, state: UninitializedGameState): HydratedFreibeuterGameState {
        const numPlayers = game.players.length
        if (numPlayers < MIN_PLAYERS || numPlayers > MAX_PLAYERS) {
            throw Error(`Freibeuter cannot be played with ${numPlayers} players`)
        }
        const prng = new Prng(state.prng)
        const pilePrngState = (state.systemVersion ?? 1) >= 3 ? state.protectedPrng : state.prng
        assertExists(pilePrngState, 'Protected pile initialization requires protectedPrng')
        const pilePrng = new Prng(pilePrngState)

        const colors = structuredClone(FreibeuterColors)
        shuffle(colors, prng.random)
        const players = game.players.map(
            (player, index) =>
                new HydratedFreibeuterPlayerState({
                    playerId: player.id,
                    color: colors[index],
                    boats: BOATS_PER_PLAYER,
                    treasure: START_TREASURE,
                    loans: 0,
                    ships: [],
                    seaCount: 0,
                    dutchmanCount: 0,
                    hand: []
                })
        )
        const turnManager = HydratedTurnManager.generate(players, prng.random)
        const counters = shuffledCounters(prng.random)

        const seaPile = HydratedCardPile.generate(allSeaCards(), pilePrng.random)
        const dutchmanPile = HydratedCardPile.generate(allDutchmanCards(), pilePrng.random)
        for (const player of players) {
            for (let dealt = 0; dealt < START_SEA_CARDS; dealt++) player.addCard(seaPile.draw())
            for (let dealt = 0; dealt < START_DUTCHMAN_CARDS; dealt++) {
                player.addCard(dutchmanPile.draw())
            }
        }

        const initialState: FreibeuterProjectedState = Object.assign(state, {
            players,
            turnManager,
            machineState: MachineState.StartOfTurn,
            placedBoats: [],
            counters,
            removedChests: 0,
            removedDoublings: [],
            seaPile,
            dutchmanPile,
            seaDiscard: [],
            dutchmanDiscard: [],
            surrounded: [],
            passes: 0
        })
        return new HydratedFreibeuterGameState(initialState)
    }
}
