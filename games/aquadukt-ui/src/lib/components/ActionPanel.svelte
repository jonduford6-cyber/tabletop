<script lang="ts">
    import {
        ActionType,
        MAX_CANALS_PER_TURN,
        MAX_HOUSES_PER_ROLL_ACTION,
        MachineState,
        TILE_VALUES,
        isRollDie
    } from '@tabletop/aquadukt'
    import { getGameSession } from '$lib/model/gameSessionContext.svelte.js'
    import Die from './Die.svelte'
    import TileChip from './TileChip.svelte'

    const gameSession = getGameSession()

    const state = $derived(gameSession.gameState)
    const myId = $derived(gameSession.myPlayer?.id)
    const myState = $derived(myId ? state.getPlayerState(myId) : undefined)
    const fill = $derived(gameSession.colors.getPlayerUiColor(myId))
    const ink = $derived(gameSession.colors.getPlayerTextColorValue(myId))
    const mode = $derived(gameSession.chosenAction)
    const valid = $derived(gameSession.validActionTypes)
    const rolledRegion = $derived(state.rolledRegion)
    const lastRoll = $derived(gameSession.actions.findLast(isRollDie)?.metadata)
    const onlyPass = $derived(valid.length === 1 && valid[0] === ActionType.Pass)

    const heading = $derived.by(() => {
        if (onlyPass) return 'No legal action'
        switch (state.machineState) {
            case MachineState.HouseRolled:
                return `Place a house in region ${rolledRegion}`
            case MachineState.HousePlaced:
                return `House placed (${state.housesPlacedThisTurn} of ${MAX_HOUSES_PER_ROLL_ACTION})`
            case MachineState.CanalPlaced:
                return `Canal placed (${state.canalsPlacedThisTurn} of ${MAX_CANALS_PER_TURN})`
            default:
                break
        }
        switch (mode) {
            case ActionType.PlaceSpring:
                return 'Discover a spring'
            case ActionType.PlaceCanal:
                return 'Build canals'
            default:
                return 'Choose an action'
        }
    })

    const hint = $derived.by(() => {
        if (onlyPass) return 'Your turn is skipped automatically.'
        if (mode === ActionType.PlaceHouse) {
            return gameSession.chosenTileValue === undefined
                ? 'Pick a tile, then click a free square in the highlighted region.'
                : 'Click a free square in the highlighted region.'
        }
        if (mode === ActionType.PlaceSpring) {
            return 'Click an intersection. Springs must be at least 5 steps apart.'
        }
        if (mode === ActionType.PlaceCanal) {
            return 'Click an edge next to a spring or the end of a canal. Click a canal again to double it.'
        }
        return undefined
    })

    const startActions = [ActionType.RollDie, ActionType.PlaceSpring, ActionType.PlaceCanal]
</script>

<div
    class="mb-2 flex flex-row flex-wrap justify-center items-center gap-x-6 gap-y-2 rounded-md px-4 py-2.5 bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
    data-testid="action-panel"
>
    {#if rolledRegion !== undefined}
        <div class="flex flex-col items-center" data-testid="roll-display">
            <Die value={rolledRegion} size={64} />
            <span class="text-sm font-semibold">Region {rolledRegion}</span>
        </div>
    {/if}

    <div class="flex flex-col justify-center items-center text-center">
        <h1 class="text-lg font-semibold leading-tight">{heading}</h1>
        {#if hint}
            <p class="text-sm text-gray-600 dark:text-gray-400">{hint}</p>
        {/if}
        {#if rolledRegion !== undefined && lastRoll && lastRoll.skippedFullRegions.length > 0}
            <p class="text-sm text-gray-600 dark:text-gray-400">
                Rolled full {lastRoll.skippedFullRegions.length === 1 ? 'region' : 'regions'}
                {lastRoll.skippedFullRegions.join(', ')} first and rolled again.
            </p>
        {/if}

        {#if mode === ActionType.PlaceHouse && myState}
            <div class="flex flex-row justify-center items-center gap-2 mt-1.5">
                {#each TILE_VALUES as value (value)}
                    {@const left = myState.tilesLeft(value)}
                    <button
                        class="choice tile"
                        class:selected={gameSession.chosenTileValue === value}
                        disabled={left === 0}
                        aria-pressed={gameSession.chosenTileValue === value}
                        data-testid="tile-choice-{value}"
                        title={left === 0 ? `No ${value}-house tiles left` : `${value}-house tile`}
                        onclick={() => gameSession.chooseTileValue(value)}
                    >
                        <TileChip {value} {fill} {ink} size={36} dimmed={left === 0} />
                        <span class="count">&times;{left}</span>
                    </button>
                {/each}
            </div>
        {/if}

        <div class="flex flex-row flex-wrap justify-center items-start gap-2 mt-1.5">
            {#if state.machineState === MachineState.StartOfTurn && !mode && !onlyPass}
                {#each startActions as action (action)}
                    {@const reason = gameSession.unavailableReason(action)}
                    <div class="flex flex-col items-center max-w-[150px]">
                        <button
                            class="choice"
                            disabled={reason !== undefined}
                            data-testid="action-{action}"
                            onclick={() =>
                                action === ActionType.RollDie
                                    ? gameSession.rollDie()
                                    : gameSession.chooseAction(action)}
                        >
                            {gameSession.nameForActionType(action)}
                        </button>
                        {#if reason}
                            <span class="reason" data-testid="reason-{action}">{reason}</span>
                        {/if}
                    </div>
                {/each}
            {/if}
            {#if state.machineState === MachineState.HousePlaced && valid.includes(ActionType.RollDie)}
                <button
                    class="choice"
                    data-testid="action-{ActionType.RollDie}"
                    onclick={() => gameSession.rollDie()}
                >
                    Roll die again
                </button>
            {/if}
            {#if valid.includes(ActionType.EndTurn)}
                <button
                    class="choice"
                    data-testid="action-{ActionType.EndTurn}"
                    onclick={() => gameSession.endTurn()}
                >
                    End turn
                </button>
            {/if}
        </div>

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
    .tile {
        padding: 2px 8px 2px 4px;
    }
    .tile.selected {
        border-color: #4f46e5;
        box-shadow: 0 0 0 2px #818cf8;
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
