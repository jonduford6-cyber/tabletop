import {
    BaseGameInitializer,
    HydratedTurnManager,
    Prng,
    assertExists,
    shuffle,
    type Game,
    type GameInitializer,
    type Player,
    type RandomFunction,
    type UninitializedGameState
} from '@tabletop/common'
import { Board } from '../components/board.js'
import { AquaduktGameState, HydratedAquaduktGameState } from '../model/gameState.js'
import { HydratedAquaduktPlayerState } from '../model/playerState.js'
import { AquaduktColors } from './colors.js'
import { SETUP_BY_PLAYER_COUNT } from './setup.js'
import { MachineState } from './states.js'

export class AquaduktGameInitializer
    extends BaseGameInitializer<AquaduktGameState, HydratedAquaduktGameState>
    implements GameInitializer<AquaduktGameState, HydratedAquaduktGameState>
{
    initializeGameState(game: Game, state: UninitializedGameState): HydratedAquaduktGameState {
        const prng = new Prng(state.prng)
        const setup = SETUP_BY_PLAYER_COUNT[game.players.length]
        assertExists(setup, `Aquädukt cannot be played with ${game.players.length} players`)

        const players = this.initializePlayers(game, setup.tilesByValue, prng.random)
        const turnManager = HydratedTurnManager.generate(players, prng.random)

        const squares = [...Board.playableSquares]
        shuffle(squares, prng.random)

        const initialState: AquaduktGameState = Object.assign(state, {
            players,
            turnManager,
            machineState: MachineState.StartOfTurn,
            mountains: squares.slice(0, setup.mountains),
            houses: [],
            springs: [],
            canals: [],
            housesPlacedThisTurn: 0,
            canalsPlacedThisTurn: 0,
            consecutivePasses: 0,
            finalRound: false
        })
        return new HydratedAquaduktGameState(initialState)
    }

    private initializePlayers(
        game: Game,
        tilesByValue: readonly number[],
        random: RandomFunction
    ): HydratedAquaduktPlayerState[] {
        const colors = structuredClone(AquaduktColors)
        shuffle(colors, random)

        return game.players.map(
            (player: Player, index: number) =>
                new HydratedAquaduktPlayerState({
                    playerId: player.id,
                    color: colors[index],
                    tiles: [...tilesByValue]
                })
        )
    }
}
