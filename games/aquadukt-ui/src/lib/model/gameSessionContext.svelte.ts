import { createGameSessionContext } from '@tabletop/frontend-components'
import type { AquaduktGameSession } from '../stores/AquaduktGameSession.svelte.js'

const [getContext, setContext] = createGameSessionContext<AquaduktGameSession>()

export function setGameSession(session: AquaduktGameSession) {
    setContext(session)
}

export function getGameSession(): AquaduktGameSession {
    return getContext()
}
