<script lang="ts">
    import type { Card } from '@tabletop/freibeuter'
    import { cardLabel } from '$lib/utils/actionDescriptions.js'

    let {
        card,
        selected = false,
        disabled = false,
        reason,
        onclick
    }: {
        card: Card
        selected?: boolean
        disabled?: boolean
        reason?: string
        onclick?: () => void
    } = $props()

    const label = $derived(cardLabel(card.type, card.target))
</script>

<button
    type="button"
    class="card"
    class:dutchman={card.type === 'dutchman'}
    class:selected
    class:disabled
    aria-pressed={selected}
    title={reason ??
        (card.type === 'sea' ? `Sea card ${card.target}` : `Flying Dutchman card, ${label}`)}
    data-testid="hand-card"
    data-card={`${card.type}:${card.target}`}
    {onclick}
>
    <span class="kind">{card.type === 'sea' ? 'Sea' : 'Dutchman'}</span>
    <span class="label">{card.type === 'sea' ? card.target : card.target.slice(4)}</span>
    {#if card.type === 'dutchman'}
        <span class="kind">{card.target.startsWith('row:') ? 'row' : 'column'}</span>
    {/if}
</button>

<style>
    .card {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-width: 58px;
        min-height: 68px;
        padding: 4px 8px;
        border-radius: 8px;
        border: 2px solid #7a5a2a;
        background: #f6ecd0;
        color: #3b2a14;
        line-height: 1.05;
    }
    .card.dutchman {
        background: #e8edf2;
        border-style: dashed;
        border-color: #64748b;
        color: #1f2937;
    }
    .card.selected {
        box-shadow: 0 0 0 3px #facc15;
        border-color: #eab308;
    }
    .card.disabled {
        opacity: 0.5;
    }
    .card:hover:not(.disabled) {
        background: #fff6d8;
    }
    .kind {
        font-size: 0.65rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }
    .label {
        font-size: 1.5rem;
        font-weight: 800;
        font-family: Georgia, serif;
    }
</style>
