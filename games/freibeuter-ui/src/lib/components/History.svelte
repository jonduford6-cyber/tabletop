<script lang="ts">
    import { PlayerName } from '@tabletop/frontend-components'
    import { getGameSession } from '$lib/model/gameSessionContext.svelte.js'
    import { describeAction } from '$lib/utils/actionDescriptions.js'

    const gameSession = getGameSession()

    const entries = $derived(gameSession.actions.toReversed())
</script>

<div
    class="h-full min-h-[300px] overflow-hidden rounded-md bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
    data-testid="history"
>
    <div class="h-full overflow-auto px-1.5 py-2">
        {#if gameSession.gameState.result}
            <div class="marker">Game over</div>
        {/if}
        {#each entries as action (action.id)}
            <div class="entry bg-white/70 dark:bg-gray-700/45" data-testid="history-entry">
                <span
                    class="dot"
                    style:background={action.playerId
                        ? gameSession.colors.getPlayerUiColor(action.playerId)
                        : '#9ca3af'}
                ></span>
                <div class="min-w-0 text-sm leading-snug">
                    {#if action.playerId}
                        <PlayerName playerId={action.playerId} />
                    {/if}
                    {describeAction(action, (id) => gameSession.getPlayerName(id))}
                </div>
            </div>
        {/each}
        <div class="marker">Game started</div>
    </div>
</div>

<style>
    .entry {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 4px;
        padding: 6px 8px;
        border-radius: 6px;
    }
    .dot {
        flex-shrink: 0;
        width: 14px;
        height: 14px;
        border-radius: 999px;
        border: 2px solid #1f2937;
    }
    .marker {
        padding: 8px;
        font-size: 0.75rem;
        text-align: center;
        color: rgb(107 114 128);
    }
</style>
