<script lang="ts">
    import { ActionType, DRUIDS_PER_PLAYER, MachineState, board } from '@tabletop/dolmengotter'
    import { getGameSession } from '$lib/model/gameSessionContext.svelte.js'
    import { circleLabel } from '$lib/utils/actionDescriptions.js'

    const gameSession = getGameSession()

    const state = $derived(gameSession.gameState)
    const machine = $derived(state.machineState)
    const myState = $derived(
        gameSession.viewerId ? state.getPlayerState(gameSession.viewerId) : undefined
    )
    const mode = $derived(gameSession.chosenAction)
    const druidsLeft = $derived(myState ? DRUIDS_PER_PLAYER - myState.druids.length : 0)
    const vacated = $derived(gameSession.vacatedPlace)
    const rights = $derived(gameSession.myDolmenRights)
    const chosenRight = $derived(gameSession.chosenRight)
    const batchOfChosen = $derived(
        gameSession.chosenCircleId === undefined
            ? undefined
            : state.circles[gameSession.chosenCircleId].batch.length
    )

    const heading = $derived.by(() => {
        switch (machine) {
            case MachineState.PlacingDruids:
                return 'Place a druid'
            case MachineState.StoneDecision:
                return vacated
                    ? `Place a stone on ${gameSession.spotLabel(vacated)}?`
                    : 'Place a stone?'
            case MachineState.DolmenDecision:
                return rights.length > 1 ? 'Dolmen decisions' : 'Dolmen decision'
            default:
                return mode ? gameSession.nameForActionType(mode) : 'Choose an action'
        }
    })

    const hint = $derived.by(() => {
        if (machine === MachineState.PlacingDruids) {
            return `Click a free stone place. ${druidsLeft} druid${druidsLeft === 1 ? '' : 's'} left to place.`
        }
        if (machine === MachineState.StartOfTurn) {
            if (mode === ActionType.Walk) {
                return gameSession.chosenDruid
                    ? 'Click a highlighted place. A druid may pass a row of druids.'
                    : 'Click one of your upright druids (blue ring), then a highlighted place.'
            }
            if (mode === ActionType.Flight) {
                return gameSession.chosenDruid
                    ? 'Click any highlighted free stone place.'
                    : 'Click one of your druids lying on its belly, then a free stone place.'
            }
            if (mode === ActionType.CollectHerbs) {
                return gameSession.chosenDruid
                    ? 'The selected druid will lie down on its belly.'
                    : 'Click the upright druid that collects the herbs.'
            }
        }
        if (machine === MachineState.StoneDecision) {
            return 'The stone goes on the place the druid just left.'
        }
        return undefined
    })

    function rightText(kind: 'majority' | 'equalizer', circleId: number): string {
        const empty = state.circles[circleId].batch.length === 0
        if (empty) return 'starts the stack'
        return kind === 'majority' ? 'goes on top of the stack' : 'goes under the stack'
    }
</script>

<div
    class="mb-2 flex flex-row flex-wrap justify-center items-center gap-x-6 gap-y-2 rounded-md px-4 py-2.5 bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
    data-testid="action-panel"
>
    <div class="flex flex-col justify-center items-center text-center">
        <h1 class="text-lg font-semibold leading-tight" data-testid="action-heading">{heading}</h1>
        {#if hint}
            <p class="text-sm text-gray-600 dark:text-gray-400">{hint}</p>
        {/if}

        {#if machine === MachineState.StartOfTurn}
            <div class="flex flex-row flex-wrap justify-center items-start gap-2 mt-1.5">
                {#each gameSession.turnChoices as action (action)}
                    {@const reason = gameSession.unavailableReason(action)}
                    <div class="flex flex-col items-center max-w-[170px]">
                        <button
                            class="choice"
                            class:selected={mode === action}
                            disabled={reason !== undefined}
                            aria-pressed={mode === action}
                            title={reason}
                            data-testid="action-{action}"
                            onclick={() => gameSession.chooseAction(action)}
                        >
                            {gameSession.nameForActionType(action)}
                        </button>
                        {#if reason}
                            <span class="reason" data-testid="reason-{action}">{reason}</span>
                        {/if}
                    </div>
                {/each}
            </div>
            {#if mode === ActionType.CollectHerbs}
                <div class="mt-1.5">
                    <button
                        class="choice primary"
                        disabled={!gameSession.chosenDruid}
                        title={gameSession.chosenDruid ? undefined : 'Pick a druid first'}
                        data-testid="confirm-herbs"
                        onclick={() => gameSession.collectHerbs()}
                    >
                        Collect herbs
                    </button>
                </div>
            {/if}
        {/if}

        {#if machine === MachineState.StoneDecision}
            <div class="flex flex-row flex-wrap justify-center items-start gap-2 mt-1.5">
                <div class="flex flex-col items-center max-w-[200px]">
                    <button
                        class="choice primary"
                        data-testid="place-stone"
                        onclick={() => gameSession.placeStone()}
                    >
                        Place a stone
                    </button>
                </div>
                <div class="flex flex-col items-center max-w-[220px]">
                    <button
                        class="choice"
                        disabled={gameSession.declineStoneProblem !== undefined}
                        title={gameSession.declineStoneProblem ?? gameSession.declineStoneCost}
                        data-testid="decline-stone"
                        onclick={() => gameSession.declineStone()}
                    >
                        Decline
                    </button>
                    {#if gameSession.declineStoneProblem}
                        <span class="reason" data-testid="decline-reason"
                            >{gameSession.declineStoneProblem}</span
                        >
                    {:else if gameSession.declineStoneCost}
                        <span class="reason" data-testid="decline-cost"
                            >{gameSession.declineStoneCost}</span
                        >
                    {/if}
                </div>
            </div>
        {/if}

        {#if machine === MachineState.DolmenDecision}
            <div class="flex flex-col items-center gap-1.5 mt-1">
                {#each rights as right (right.circleId)}
                    <button
                        class="choice"
                        class:selected={gameSession.chosenCircleId === right.circleId}
                        aria-pressed={gameSession.chosenCircleId === right.circleId}
                        data-testid="right-{right.circleId}"
                        onclick={() => gameSession.chooseCircle(right.circleId)}
                    >
                        {circleLabel(right.circleId)} (factor {board.circle(right.circleId)
                            .printedFactor}): your dolmen {rightText(right.kind, right.circleId)}
                    </button>
                {/each}
                {#if chosenRight && batchOfChosen !== undefined}
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                        {chosenRight.kind === 'majority'
                            ? 'You hold the majority here.'
                            : 'You equalized the lead here.'}
                        The stack has {batchOfChosen} dolmen{batchOfChosen === 1 ? '' : 's'}.
                    </p>
                {/if}
                <div
                    class="flex flex-row flex-wrap justify-center gap-2"
                    data-testid="dolmen-values"
                >
                    {#each gameSession.myStock as entry (entry.value)}
                        <button
                            class="choice value"
                            class:selected={gameSession.chosenDolmenValue === entry.value}
                            aria-pressed={gameSession.chosenDolmenValue === entry.value}
                            data-testid="dolmen-choice-{entry.value}"
                            title="{entry.count} dolmen{entry.count === 1
                                ? ''
                                : 's'} of value {entry.value}"
                            onclick={() => gameSession.chooseDolmenValue(entry.value)}
                        >
                            <b>{entry.value}</b>
                            <span class="count">&times;{entry.count}</span>
                        </button>
                    {/each}
                </div>
                <div class="flex flex-row flex-wrap justify-center items-start gap-2">
                    <div class="flex flex-col items-center max-w-[220px]">
                        <button
                            class="choice primary"
                            disabled={gameSession.placeDolmenProblem !== undefined}
                            title={gameSession.placeDolmenProblem}
                            data-testid="place-dolmen"
                            onclick={() => gameSession.placeDolmen()}
                        >
                            Place dolmen
                        </button>
                        {#if gameSession.placeDolmenProblem}
                            <span class="reason" data-testid="place-dolmen-reason"
                                >{gameSession.placeDolmenProblem}</span
                            >
                        {/if}
                    </div>
                    <button
                        class="choice"
                        disabled={gameSession.chosenCircleId === undefined}
                        title={gameSession.chosenCircleId === undefined
                            ? 'Choose the circle first'
                            : 'Decline: no consequence, and the chance is gone'}
                        data-testid="decline-dolmen"
                        onclick={() => gameSession.declineDolmen()}
                    >
                        Decline
                    </button>
                </div>
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
    .value {
        min-width: 56px;
        justify-content: center;
    }
    .count {
        font-variant-numeric: tabular-nums;
        font-weight: 600;
    }
    .reason {
        margin-top: 2px;
        font-size: 0.75rem;
        line-height: 1.15;
        color: #6b7280;
    }
</style>
