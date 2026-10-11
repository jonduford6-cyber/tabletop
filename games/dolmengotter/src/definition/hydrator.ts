import { GameAction, type GameHydrator, type HydratedAction } from '@tabletop/common'
import { HydratedCollectHerbs, isCollectHerbs } from '../actions/collectHerbs.js'
import { HydratedDeclineDolmen, isDeclineDolmen } from '../actions/declineDolmen.js'
import { HydratedDeclineStone, isDeclineStone } from '../actions/declineStone.js'
import { HydratedFlight, isFlight } from '../actions/flight.js'
import { HydratedPlaceDolmen, isPlaceDolmen } from '../actions/placeDolmen.js'
import { HydratedPlaceDruid, isPlaceDruid } from '../actions/placeDruid.js'
import { HydratedPlaceStone, isPlaceStone } from '../actions/placeStone.js'
import { HydratedScoreCircle, isScoreCircle } from '../actions/scoreCircle.js'
import { HydratedWalk, isWalk } from '../actions/walk.js'
import {
    HydratedDolmengotterGameState,
    type DolmengotterProjectedState
} from '../model/gameState.js'

export class DolmengotterHydrator implements GameHydrator<
    DolmengotterProjectedState,
    HydratedDolmengotterGameState
> {
    hydrateAction(data: GameAction): HydratedAction {
        switch (true) {
            case isPlaceDruid(data):
                return new HydratedPlaceDruid(data)
            case isWalk(data):
                return new HydratedWalk(data)
            case isCollectHerbs(data):
                return new HydratedCollectHerbs(data)
            case isFlight(data):
                return new HydratedFlight(data)
            case isPlaceStone(data):
                return new HydratedPlaceStone(data)
            case isDeclineStone(data):
                return new HydratedDeclineStone(data)
            case isPlaceDolmen(data):
                return new HydratedPlaceDolmen(data)
            case isDeclineDolmen(data):
                return new HydratedDeclineDolmen(data)
            case isScoreCircle(data):
                return new HydratedScoreCircle(data)
            default:
                throw new Error(`Unknown action type ${data.type}`)
        }
    }

    hydrateState(state: DolmengotterProjectedState): HydratedDolmengotterGameState {
        return new HydratedDolmengotterGameState(state)
    }
}
