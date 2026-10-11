import { createGameSessionContext } from '@tabletop/frontend-components'
import type { FreibeuterGameSession } from '../stores/FreibeuterGameSession.svelte.js'

const [getContext, setContext] = createGameSessionContext<FreibeuterGameSession>()

export function setGameSession(session: FreibeuterGameSession) {
    setContext(session)
}

export function getGameSession(): FreibeuterGameSession {
    return getContext()
}
