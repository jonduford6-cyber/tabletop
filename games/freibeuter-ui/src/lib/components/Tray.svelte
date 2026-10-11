<script lang="ts">
    import { CHEST_COUNT } from '@tabletop/freibeuter'
    import { getGameSession } from '$lib/model/gameSessionContext.svelte.js'

    const gameSession = getGameSession()

    const state = $derived(gameSession.gameState)
    const doublings = $derived(state.removedDoublings.toSorted((a, b) => a - b))
</script>

<div
    class="rounded-md px-3 py-2 bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
    data-testid="tray"
>
    <div class="text-sm font-semibold">Removed from the board</div>
    <div class="flex flex-row items-center gap-1 mt-1" data-testid="removed-chests">
        <span class="text-sm">Chests {state.removedChests} of {CHEST_COUNT}:</span>
        {#each Array.from({ length: CHEST_COUNT }, (_, index) => index) as index (index)}
            <span class="token chest" class:empty={index >= state.removedChests}>&#x1F4B0;</span>
        {/each}
    </div>
    <div class="flex flex-row flex-wrap items-center gap-1 mt-1" data-testid="removed-doublings">
        <span class="text-sm">Doubling counters:</span>
        {#each doublings as value (value)}
            <span class="token doubling">x2 &middot; {value}</span>
        {/each}
        {#if doublings.length === 0}<span class="text-sm text-gray-600 dark:text-gray-400"
                >none</span
            >{/if}
    </div>
</div>

<style>
    .token {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 28px;
        height: 28px;
        padding: 0 6px;
        border-radius: 999px;
        font-size: 0.8rem;
        font-weight: 700;
        background: #fdf6e3;
        color: #111827;
    }
    .chest {
        border: 3px solid #e8b923;
    }
    .chest.empty {
        opacity: 0.25;
        filter: grayscale(1);
    }
    .doubling {
        border: 3px solid #c0392b;
    }
</style>
