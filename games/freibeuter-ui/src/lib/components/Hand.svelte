<script lang="ts">
    import { getGameSession } from '$lib/model/gameSessionContext.svelte.js'
    import { cardKey } from '$lib/model/stagedSelection.js'
    import CardChip from './CardChip.svelte'

    const gameSession = getGameSession()

    const hand = $derived(gameSession.myHand)
    const selected = $derived(gameSession.selectedCard)
    const interactive = $derived(gameSession.isChoosingTurnAction)
</script>

{#if gameSession.viewerId}
    <div
        class="mb-2 flex flex-col items-center gap-1 rounded-md px-3 py-2 bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
        data-testid="hand"
    >
        <span class="text-sm font-semibold">Your hand (only you can see it)</span>
        <div class="flex flex-row flex-wrap justify-center gap-2">
            {#each hand as card, index (index)}
                {@const problem = gameSession.cardProblem(card)}
                <CardChip
                    {card}
                    selected={selected !== undefined &&
                        cardKey(selected.type, selected.target) === cardKey(card.type, card.target)}
                    disabled={interactive && problem !== undefined}
                    reason={interactive ? problem : undefined}
                    onclick={interactive ? () => gameSession.chooseCard(card) : undefined}
                />
            {/each}
            {#if hand.length === 0}
                <span class="text-sm text-gray-600 dark:text-gray-400">You hold no cards.</span>
            {/if}
        </div>
    </div>
{/if}
