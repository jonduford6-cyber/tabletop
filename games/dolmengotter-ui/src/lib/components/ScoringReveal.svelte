<script lang="ts">
    import { getGameSession } from '$lib/model/gameSessionContext.svelte.js'
    import { circleLabel } from '$lib/utils/actionDescriptions.js'
    import { recentScorings } from '$lib/utils/recentScoring.js'

    const gameSession = getGameSession()

    const scorings = $derived(recentScorings(gameSession.actions))
</script>

{#if scorings.length > 0}
    <div
        class="mb-2 flex flex-row flex-wrap justify-center gap-x-6 gap-y-2 rounded-md px-3 py-2 bg-amber-100 text-gray-900 dark:bg-amber-900/40 dark:text-gray-100"
        data-testid="scoring-reveal"
    >
        {#each scorings as scoring (scoring.id)}
            <div class="flex flex-col items-center">
                <span class="text-sm font-semibold">Scored {circleLabel(scoring.circleId)}</span>
                <div class="flex flex-row flex-wrap justify-center gap-1.5 mt-1">
                    {#each scoring.metadata?.dolmens ?? [] as dolmen, index (index)}
                        <span class="chip" data-testid="scored-dolmen">
                            <span
                                class="swatch"
                                style:background={gameSession.colors.getPlayerUiColor(
                                    dolmen.playerId
                                )}
                                style:color={gameSession.colors.getPlayerTextColorValue(
                                    dolmen.playerId
                                )}>{dolmen.value}</span
                            >
                            <span>&times;{dolmen.factor} = {dolmen.points}</span>
                        </span>
                    {/each}
                </div>
            </div>
        {/each}
    </div>
{/if}

<style>
    .chip {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 2px 8px 2px 3px;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.7);
        color: #111827;
        font-size: 0.85rem;
        font-weight: 600;
    }
    .swatch {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border-radius: 5px;
        border: 2px solid #111827;
        font-weight: 700;
    }
</style>
