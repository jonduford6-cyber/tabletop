import { createGameSessionContext } from '@tabletop/frontend-components'
import type { DolmengotterGameSession } from '../stores/DolmengotterGameSession.svelte.js'

const [getContext, setContext] = createGameSessionContext<DolmengotterGameSession>()

export function setGameSession(session: DolmengotterGameSession) {
    setContext(session)
}

export function getGameSession(): DolmengotterGameSession {
    return getContext()
}
