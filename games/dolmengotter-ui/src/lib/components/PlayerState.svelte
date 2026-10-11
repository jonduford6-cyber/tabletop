<script lang="ts">
    import { DRUIDS_PER_PLAYER, type HydratedDolmengotterPlayerState } from '@tabletop/dolmengotter'
    import { getGameSession } from '$lib/model/gameSessionContext.svelte.js'
    import { stockOf } from '$lib/utils/circleStacks.js'

    let {
        playerId,
        playerState
    }: { playerId: string; playerState: HydratedDolmengotterPlayerState } = $props()

    const gameSession = getGameSession()

    const isTurn = $derived(gameSession.gameState.activePlayerIds.includes(playerId))
    const bgClass = $derived(gameSession.colors.getPlayerBgColor(playerId))
    const textClass = $derived(gameSession.colors.getPlayerTextColor(playerId))
    const stock = $derived(stockOf(gameSession.gameState, playerId, gameSession.viewerId))
    const upright = $derived(playerState.druids.filter((druid) => !druid.belly).length)
    const belly = $derived(playerState.druids.filter((druid) => druid.belly).length)
    const inHand = $derived(DRUIDS_PER_PLAYER - playerState.druids.length)
    const endNote = $derived.by(() => {
        const state = gameSession.gameState
        if (state.endTriggeredBy === playerId) return 'placed their last dolmen'
        if (state.lastMoves?.includes(playerId)) return 'has a last move to make'
        return undefined
    })
</script>

<div
    class="rounded-md px-1.5 pb-1.5 {bgClass} {isTurn ? 'turn' : ''}"
    data-testid="player-panel"
    data-player-id={playerId}
>
    <div class="flex flex-row justify-between items-baseline px-1.5 py-1.5 {textClass}">
        <span class="name">{gameSession.getPlayerName(playerId)}</span>
        <span class="name" title="Victory points: the field of the scoring marker"
            ><span data-testid="player-points">{playerState.points}</span><span class="unit">
                points</span
            ></span
        >
    </div>
    <div class="tray rounded-md px-2 py-2 space-y-1">
        <div class="row" title="Stones left in the stock">
            <span>Stones left</span>
            <span class="num" data-testid="stones-left">{playerState.stones}</span>
        </div>
        <div class="row" title="Dolmens left in the stock">
            <span>Dolmens left</span>
            <span class="num" data-testid="dolmens-left">{playerState.dolmenCount}</span>
        </div>
        {#if stock}
            <div class="flex flex-row flex-wrap gap-1" data-testid="own-dolmens">
                {#each stock as entry (entry.value)}
                    <span
                        class="chip"
                        title="{entry.count} dolmen{entry.count === 1
                            ? ''
                            : 's'} of value {entry.value}"
                        ><b>{entry.value}</b>&times;{entry.count}</span
                    >
                {/each}
            </div>
        {/if}
        <div class="row" title="Dolmens placed so far (breaks ties)">
            <span>Dolmens built</span>
            <span class="num">{playerState.dolmensPlaced}</span>
        </div>
        <div class="row" title="Upright druids, druids on their belly, druids still in hand">
            <span>Druids</span>
            <span class="num" data-testid="druids"
                >{upright} up{belly > 0 ? `, ${belly} belly` : ''}{inHand > 0
                    ? `, ${inHand} in hand`
                    : ''}</span
            >
        </div>
        {#if endNote}
            <div class="text-xs text-amber-300" data-testid="end-note">{endNote}</div>
        {/if}
    </div>
</div>

<style>
    .turn {
        box-shadow: inset 0 0 0 4px #ffffff;
    }
    .tray {
        background: #1f2937;
        color: #f3f4f6;
        box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.35);
    }
    .name {
        font-size: 1.1rem;
        font-weight: 700;
        line-height: 1;
        font-variant-numeric: tabular-nums;
    }
    .unit {
        font-size: 0.7rem;
        font-weight: 500;
    }
    .row {
        display: flex;
        justify-content: space-between;
        font-size: 0.8rem;
    }
    .num {
        font-weight: 700;
        font-variant-numeric: tabular-nums;
    }
    .chip {
        padding: 1px 6px;
        border-radius: 5px;
        background: #374151;
        font-size: 0.8rem;
    }
</style>
