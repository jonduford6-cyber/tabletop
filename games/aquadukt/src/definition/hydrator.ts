import { GameAction, type GameHydrator, type HydratedAction } from '@tabletop/common'
import { AquaduktGameState, HydratedAquaduktGameState } from '../model/gameState.js'
import { HydratedEndTurn, isEndTurn } from '../actions/endTurn.js'
import { HydratedPass, isPass } from '../actions/pass.js'
import { HydratedPlaceCanal, isPlaceCanal } from '../actions/placeCanal.js'
import { HydratedPlaceHouse, isPlaceHouse } from '../actions/placeHouse.js'
import { HydratedPlaceSpring, isPlaceSpring } from '../actions/placeSpring.js'
import { HydratedRollDie, isRollDie } from '../actions/rollDie.js'

export class AquaduktHydrator implements GameHydrator<
    AquaduktGameState,
    HydratedAquaduktGameState
> {
    hydrateAction(data: GameAction): HydratedAction {
        switch (true) {
            case isRollDie(data): {
                return new HydratedRollDie(data)
            }
            case isPlaceHouse(data): {
                return new HydratedPlaceHouse(data)
            }
            case isPlaceSpring(data): {
                return new HydratedPlaceSpring(data)
            }
            case isPlaceCanal(data): {
                return new HydratedPlaceCanal(data)
            }
            case isEndTurn(data): {
                return new HydratedEndTurn(data)
            }
            case isPass(data): {
                return new HydratedPass(data)
            }
            default: {
                throw new Error(`Unknown action type ${data.type}`)
            }
        }
    }

    hydrateState(state: AquaduktGameState): HydratedAquaduktGameState {
        return new HydratedAquaduktGameState(state)
    }
}
