<script lang="ts">
    import { MachineState } from '@tabletop/freibeuter'
    import { PlayerName } from '@tabletop/frontend-components'
    import { getGameSession } from '$lib/model/gameSessionContext.svelte.js'
    import { describeAction } from '$lib/utils/actionDescriptions.js'

    const gameSession = getGameSession()

    const state = $derived(gameSession.gameState)
    const activeId = $derived(state.activePlayerIds[0])
    const lastAction = $derived(gameSession.actions.findLast((action) => action.playerId))
    const status = $derived.by(() => {
        switch (state.machineState) {
            case MachineState.ResolvingEntities:
                return 'is resolving surrounded entities'
            case MachineState.Drawing:
                return 'is drawing a card'
            default:
                return 'is choosing an action'
        }
    })
</script>

<div
    class="mb-2 flex flex-row flex-wrap justify-center items-center gap-x-6 gap-y-2 rounded-md px-4 py-2.5 bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
    data-testid="waiting-panel"
>
    <div class="flex flex-col justify-center items-center text-center">
        <h1 class="text-lg font-semibold leading-tight">Waiting</h1>
        <p class="text-sm text-gray-600 dark:text-gray-300">
            <PlayerName playerId={activeId} />
            {status}
        </p>
        {#if lastAction}
            <p class="text-sm text-gray-600 dark:text-gray-400">
                Last: <PlayerName playerId={lastAction.playerId} />
                {describeAction(lastAction, (id) => gameSession.getPlayerName(id))}
            </p>
        {/if}
    </div>
</div>
