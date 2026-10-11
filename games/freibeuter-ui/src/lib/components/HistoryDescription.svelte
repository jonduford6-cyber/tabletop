<script lang="ts">
    import { PlayerName } from '@tabletop/frontend-components'
    import { getGameSession } from '$lib/model/gameSessionContext.svelte.js'
    import { describeAction } from '$lib/utils/actionDescriptions.js'

    const gameSession = getGameSession()
    const action = $derived(gameSession.currentAction)
</script>

<div
    class="mb-2 rounded-md px-4 py-2.5 text-center bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
    data-testid="history-description"
>
    {#if action}
        <PlayerName playerId={action.playerId} />
        {describeAction(action, (id) => gameSession.getPlayerName(id))}
    {:else}
        The game has just started.
    {/if}
</div>
