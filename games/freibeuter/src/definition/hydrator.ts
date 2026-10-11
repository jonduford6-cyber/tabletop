import { GameAction, type GameHydrator, type HydratedAction } from '@tabletop/common'
import { HydratedCaptureShip, isCaptureShip } from '../actions/captureShip.js'
import { HydratedDrawCard, isDrawCard } from '../actions/drawCard.js'
import { HydratedEndGame, isEndGame } from '../actions/endGame.js'
import { HydratedPass, isPass } from '../actions/pass.js'
import { HydratedPlayDutchmanCard, isPlayDutchmanCard } from '../actions/playDutchmanCard.js'
import { HydratedPlaySeaCard, isPlaySeaCard } from '../actions/playSeaCard.js'
import { HydratedResolveEntity, isResolveEntity } from '../actions/resolveEntity.js'
import { HydratedFreibeuterGameState, type FreibeuterProjectedState } from '../model/gameState.js'

export class FreibeuterHydrator implements GameHydrator<
    FreibeuterProjectedState,
    HydratedFreibeuterGameState
> {
    hydrateAction(data: GameAction): HydratedAction {
        switch (true) {
            case isCaptureShip(data):
                return new HydratedCaptureShip(data)
            case isPlaySeaCard(data):
                return new HydratedPlaySeaCard(data)
            case isPlayDutchmanCard(data):
                return new HydratedPlayDutchmanCard(data)
            case isResolveEntity(data):
                return new HydratedResolveEntity(data)
            case isDrawCard(data):
                return new HydratedDrawCard(data)
            case isPass(data):
                return new HydratedPass(data)
            case isEndGame(data):
                return new HydratedEndGame(data)
            default:
                throw new Error(`Unknown action type ${data.type}`)
        }
    }

    hydrateState(state: FreibeuterProjectedState): HydratedFreibeuterGameState {
        return new HydratedFreibeuterGameState(state)
    }
}
