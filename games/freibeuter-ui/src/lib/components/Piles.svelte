<script lang="ts">
    import { cardLabel } from '$lib/utils/actionDescriptions.js'
    import { getGameSession } from '$lib/model/gameSessionContext.svelte.js'

    const gameSession = getGameSession()

    const state = $derived(gameSession.gameState)
    const seaDiscard = $derived(state.seaDiscard.map((card) => cardLabel(card.type, card.target)))
    const dutchmanDiscard = $derived(
        state.dutchmanDiscard.map((card) => cardLabel(card.type, card.target))
    )
</script>

<div
    class="rounded-md px-3 py-2 bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
    data-testid="piles"
>
    <div class="grid grid-cols-2 gap-3">
        <div class="pile">
            <div class="stack sea" aria-hidden="true"></div>
            <div class="text-sm font-semibold">Sea cards</div>
            <div data-testid="sea-pile-size"><b>{state.seaPile.remaining}</b> in the pile</div>
            <div class="text-xs text-gray-600 dark:text-gray-400" data-testid="sea-discard">
                Discard ({seaDiscard.length}): {seaDiscard.length ? seaDiscard.join(', ') : 'none'}
            </div>
        </div>
        <div class="pile">
            <div class="stack dutchman" aria-hidden="true"></div>
            <div class="text-sm font-semibold">Flying Dutchman cards</div>
            <div data-testid="dutchman-pile-size">
                <b>{state.dutchmanPile.remaining}</b> in the pile
            </div>
            <div class="text-xs text-gray-600 dark:text-gray-400" data-testid="dutchman-discard">
                Discard ({dutchmanDiscard.length}): {dutchmanDiscard.length
                    ? dutchmanDiscard.join(', ')
                    : 'none'}
            </div>
        </div>
    </div>
</div>

<style>
    .pile {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    .stack {
        width: 42px;
        height: 54px;
        border-radius: 6px;
        border: 2px solid #7a5a2a;
        background: repeating-linear-gradient(
            135deg,
            #8a5a2b,
            #8a5a2b 6px,
            #a8743a 6px,
            #a8743a 12px
        );
        box-shadow: 3px 3px 0 #c9a66b;
    }
    .stack.dutchman {
        border-color: #64748b;
        border-style: dashed;
        background: repeating-linear-gradient(
            135deg,
            #cbd5e1,
            #cbd5e1 6px,
            #e2e8f0 6px,
            #e2e8f0 12px
        );
        box-shadow: 3px 3px 0 #94a3b8;
    }
</style>
