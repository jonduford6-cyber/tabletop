<script lang="ts">
    import { fade } from 'svelte/transition'
    import { MachineState } from '@tabletop/freibeuter'
    import { PlayerName } from '@tabletop/frontend-components'
    import { getGameSession } from '$lib/model/gameSessionContext.svelte.js'

    const gameSession = getGameSession()

    const activeId = $derived(gameSession.gameState.activePlayerIds[0])
    const phase = $derived.by(() => {
        switch (gameSession.gameState.machineState) {
            case MachineState.ResolvingEntities:
                return 'Resolving'
            case MachineState.Drawing:
                return 'Drawing'
            default:
                return 'Action'
        }
    })
    const canUndo = $derived(
        gameSession.isPlayable &&
            !gameSession.isViewingHistory &&
            (gameSession.hasManualSelection || gameSession.undoableAction !== undefined)
    )
</script>

<div
    class="flex h-[44px] max-sm:h-[30px] items-center justify-between px-2 max-sm:px-1 text-gray-100"
>
    <div class="header-grid grid text-[18px] max-sm:text-[14px] font-semibold">
        {#if gameSession.isViewingHistory}
            <div in:fade={{ duration: 200 }} out:fade={{ duration: 120 }}>History</div>
        {:else if gameSession.gameState.result}
            <div in:fade={{ duration: 200 }} out:fade={{ duration: 120 }}>End of game</div>
        {:else}
            <div
                in:fade={{ duration: 200 }}
                out:fade={{ duration: 120 }}
                class="inline-flex gap-x-1"
                data-testid="turn-header"
            >
                {#if gameSession.isMyTurn}
                    <span>Your turn</span>
                {:else}
                    <PlayerName playerId={activeId} possessive={true} />
                    <span>turn</span>
                {/if}
                <span class="phase" data-testid="phase">&middot; {phase}</span>
            </div>
        {/if}
    </div>

    <div class="header-grid grid text-[16px] max-sm:text-[14px]">
        {#if canUndo}
            <button type="button" onclick={() => gameSession.undo()} class="header-button"
                >Undo</button
            >
        {/if}
    </div>
</div>

<style>
    .header-grid > * {
        grid-area: 1 / 1;
    }

    .phase {
        font-weight: 500;
        color: #d1d5db;
    }

    .header-button {
        border-radius: 0.5rem;
        border: 1px solid rgba(255, 255, 255, 0.25);
        padding: 0.25rem 0.75rem;
        color: #f3f4f6;
    }

    .header-button:hover {
        background: rgba(255, 255, 255, 0.12);
    }
</style>
