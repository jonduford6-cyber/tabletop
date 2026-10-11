<script lang="ts">
    import { MachineState } from '@tabletop/dolmengotter'
    import { PlayerName } from '@tabletop/frontend-components'
    import { getGameSession } from '$lib/model/gameSessionContext.svelte.js'
    import { circleLabel, describeAction } from '$lib/utils/actionDescriptions.js'

    const gameSession = getGameSession()

    const state = $derived(gameSession.gameState)
    const activeId = $derived(state.activePlayerIds[0])
    const lastAction = $derived(gameSession.actions.findLast((action) => action.playerId))
    const status = $derived.by(() => {
        switch (state.machineState) {
            case MachineState.PlacingDruids:
                return 'is placing a druid'
            case MachineState.StoneDecision:
                return 'is deciding whether to place a stone'
            case MachineState.DolmenDecision: {
                const circles = state.pendingDolmens
                    .filter((right) => right.playerId === activeId)
                    .map((right) => circleLabel(right.circleId))
                return `is deciding about a dolmen in ${circles.join(' and ')}`
            }
            case MachineState.Scoring:
                return 'is waiting for the scoring'
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
                {describeAction(lastAction)}
            </p>
        {/if}
    </div>
</div>
