import {
    BaseGameInitializer,
    HydratedTurnManager,
    Prng,
    shuffle,
    type Game,
    type GameInitializer,
    type UninitializedGameState
} from '@tabletop/common'
import { board } from '../components/board.js'
import {
    HydratedDolmengotterGameState,
    type DolmengotterProjectedState
} from '../model/gameState.js'
import { HydratedDolmengotterPlayerState } from '../model/playerState.js'
import { DolmengotterColors } from './colors.js'
import { dolmenValuesFor, SETUP_BY_PLAYER_COUNT } from './setup.js'
import { MachineState } from './states.js'

export class DolmengotterGameInitializer
    extends BaseGameInitializer<DolmengotterProjectedState, HydratedDolmengotterGameState>
    implements GameInitializer<DolmengotterProjectedState, HydratedDolmengotterGameState>
{
    initializeGameState(game: Game, state: UninitializedGameState): HydratedDolmengotterGameState {
        const prng = new Prng(state.prng)
        const numPlayers = game.players.length
        const setup = SETUP_BY_PLAYER_COUNT[numPlayers]
        if (!setup) throw Error(`Die Dolmengötter cannot be played with ${numPlayers} players`)

        const colors = structuredClone(DolmengotterColors)
        shuffle(colors, prng.random)
        const values = dolmenValuesFor(numPlayers)
        const players = game.players.map(
            (player, index) =>
                new HydratedDolmengotterPlayerState({
                    playerId: player.id,
                    color: colors[index],
                    stones: setup.stones,
                    dolmenCount: values.length,
                    dolmens: [...values],
                    dolmensPlaced: 0,
                    scoredValues: [],
                    points: board.scoringTrack.startField,
                    druids: []
                })
        )
        const turnManager = HydratedTurnManager.generate(players, prng.random)

        const initialState: DolmengotterProjectedState = Object.assign(state, {
            players,
            turnManager,
            machineState: MachineState.PlacingDruids,
            stones: [],
            circles: board.circles.map(() => ({ hadMajority: false, batch: [] })),
            pendingDolmens: [],
            circlesToScore: [],
            ending: false
        })
        return new HydratedDolmengotterGameState(initialState)
    }
}
