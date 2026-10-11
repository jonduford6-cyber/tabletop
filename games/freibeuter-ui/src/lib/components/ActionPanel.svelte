<script lang="ts">
    import { MachineState, CounterKind, Pile } from '@tabletop/freibeuter'
    import { getGameSession } from '$lib/model/gameSessionContext.svelte.js'
    import { cardLabel } from '$lib/utils/actionDescriptions.js'
    import { shipLabel } from '$lib/utils/boardGeometry.js'

    const gameSession = getGameSession()

    const state = $derived(gameSession.gameState)
    const machine = $derived(state.machineState)
    const card = $derived(gameSession.selectedCard)
    const captureMode = $derived(gameSession.captureMode)
    const pending = $derived(gameSession.pendingOccupiedSpace)
    const choices = $derived(gameSession.drawChoices)

    const heading = $derived.by(() => {
        switch (machine) {
            case MachineState.ResolvingEntities:
                return state.surrounded.length > 1
                    ? 'Choose which surrounded entity to resolve next'
                    : 'Resolve the surrounded entity'
            case MachineState.Drawing:
                return 'Draw a card'
            default:
                if (pending) return `Space ${pending} already holds a boat`
                if (captureMode) return 'Capture a ship'
                if (card) {
                    return card.type === 'sea'
                        ? `Play sea card ${card.target}`
                        : `Play Flying Dutchman card, ${cardLabel('dutchman', card.target)}`
                }
                return 'Choose an action'
        }
    })

    const hint = $derived.by(() => {
        if (machine === MachineState.ResolvingEntities) {
            return 'Click one of the highlighted counters on the board, or use the buttons.'
        }
        if (machine === MachineState.Drawing) {
            return choices.length === 1
                ? 'Only one pile may be drawn from, so it is chosen for you.'
                : 'Choose a pile.'
        }
        if (pending) return 'Place a boat there, or take 2 treasure from the bank instead.'
        if (captureMode) return 'Click an uncaptured ship (highlighted).'
        if (card?.type === 'sea') return `Click the highlighted space ${card.target} to confirm.`
        if (card) return 'Click one of the highlighted spaces: it must surround something.'
        return 'Click a card in your hand to play it, or capture a ship.'
    })

    function entityName(intersection: string): string {
        const counter = state.counterAt(intersection)
        if (!counter) return intersection
        if (counter.kind === CounterKind.Ship) return `Ship ${shipLabel(counter.value ?? 0)}`
        return counter.kind === CounterKind.Chest
            ? 'Pirate chest'
            : `Doubling x2 (${counter.value})`
    }
</script>

<div
    class="mb-2 flex flex-row flex-wrap justify-center items-center gap-x-6 gap-y-2 rounded-md px-4 py-2.5 bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
    data-testid="action-panel"
>
    <div class="flex flex-col justify-center items-center text-center">
        <h1 class="text-lg font-semibold leading-tight" data-testid="action-heading">{heading}</h1>
        <p class="text-sm text-gray-600 dark:text-gray-400">{hint}</p>

        {#if machine === MachineState.StartOfTurn}
            <div class="flex flex-row flex-wrap justify-center items-start gap-2 mt-1.5">
                <div class="flex flex-col items-center max-w-[190px]">
                    <button
                        class="choice"
                        class:selected={captureMode}
                        disabled={gameSession.captureReason !== undefined}
                        aria-pressed={captureMode}
                        title={gameSession.captureReason}
                        data-testid="action-capture"
                        onclick={() => gameSession.chooseCapture()}
                    >
                        Capture a ship
                    </button>
                    {#if gameSession.captureReason}
                        <span class="reason" data-testid="reason-capture"
                            >{gameSession.captureReason}</span
                        >
                    {/if}
                </div>
            </div>
            {#if pending}
                <div class="flex flex-row flex-wrap justify-center gap-2 mt-1.5">
                    <button
                        class="choice primary"
                        data-testid="place-boat"
                        onclick={() => gameSession.playOccupied(false)}
                    >
                        Place a boat
                    </button>
                    <button
                        class="choice"
                        data-testid="take-treasure"
                        onclick={() => gameSession.playOccupied(true)}
                    >
                        Take 2 treasure
                    </button>
                </div>
            {/if}
        {/if}

        {#if machine === MachineState.ResolvingEntities}
            <div class="flex flex-row flex-wrap justify-center gap-2 mt-1.5">
                {#each state.surrounded as intersection (intersection)}
                    <button
                        class="choice"
                        data-testid="resolve-{intersection}"
                        onclick={() => gameSession.clickCounter(intersection)}
                    >
                        {entityName(intersection)} at {intersection}
                    </button>
                {/each}
            </div>
        {/if}

        {#if machine === MachineState.Drawing}
            <div class="flex flex-row flex-wrap justify-center items-start gap-2 mt-1.5">
                {#each [Pile.Sea, Pile.Dutchman] as pile (pile)}
                    {@const reason = gameSession.pileReason(pile)}
                    {#if reason === undefined || choices.length !== 1}
                        <div class="flex flex-col items-center max-w-[190px]">
                            <button
                                class="choice"
                                class:primary={reason === undefined}
                                disabled={reason !== undefined}
                                title={reason}
                                data-testid="draw-{pile}"
                                onclick={() => gameSession.drawFrom(pile)}
                            >
                                Draw {pile === Pile.Sea ? 'a sea card' : 'a Flying Dutchman card'}
                            </button>
                            {#if reason}
                                <span class="reason" data-testid="reason-draw-{pile}">{reason}</span
                                >
                            {/if}
                        </div>
                    {/if}
                {/each}
            </div>
        {/if}

        {#if gameSession.inspectionMessage}
            <p
                class="mt-1.5 text-sm font-medium text-amber-700 dark:text-amber-300"
                data-testid="why-not"
            >
                Not possible: {gameSession.inspectionMessage}
            </p>
        {/if}
    </div>
</div>

<style>
    .choice {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 36px;
        padding: 4px 14px;
        border-radius: 6px;
        border: 1px solid #c4c9d1;
        background: #ffffff;
        color: #111827;
        font-size: 0.95rem;
        font-weight: 500;
    }
    .choice:hover:not(:disabled) {
        background: #eef2ff;
        border-color: #818cf8;
    }
    .choice:disabled {
        opacity: 0.45;
        cursor: not-allowed;
    }
    .choice.selected {
        border-color: #4f46e5;
        box-shadow: 0 0 0 2px #818cf8;
    }
    .choice.primary {
        background: #dcfce7;
        border-color: #16a34a;
    }
    .reason {
        margin-top: 2px;
        font-size: 0.75rem;
        line-height: 1.15;
        color: #6b7280;
    }
</style>
