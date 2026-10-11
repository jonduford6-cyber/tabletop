<script lang="ts">
    import { CounterKind, type HydratedFreibeuterPlayerState } from '@tabletop/freibeuter'
    import { getGameSession } from '$lib/model/gameSessionContext.svelte.js'
    import { shipLabel } from '$lib/utils/boardGeometry.js'

    let {
        playerId,
        playerState
    }: { playerId: string; playerState: HydratedFreibeuterPlayerState } = $props()

    const gameSession = getGameSession()

    const isTurn = $derived(gameSession.gameState.activePlayerIds.includes(playerId))
    const bgClass = $derived(gameSession.colors.getPlayerBgColor(playerId))
    const textClass = $derived(gameSession.colors.getPlayerTextColor(playerId))
    const onShips = $derived(
        gameSession.gameState.counters.filter(
            (counter) => counter.kind === CounterKind.Ship && counter.captorId === playerId
        )
    )
    const onBoard = $derived(
        gameSession.gameState.placedBoats.filter((boat) => boat.playerId === playerId).length
    )
    const ships = $derived(playerState.ships.toSorted((a, b) => b - a))
</script>

<div
    class="rounded-md px-1.5 pb-1.5 {bgClass} {isTurn ? 'turn' : ''}"
    data-testid="player-panel"
    data-player-id={playerId}
>
    <div class="flex flex-row justify-between items-baseline px-1.5 py-1.5 {textClass}">
        <span class="name">{gameSession.getPlayerName(playerId)}</span>
        <span class="name" title="Treasure"
            ><span data-testid="player-treasure">{playerState.treasure}</span><span class="unit">
                treasure</span
            ></span
        >
    </div>
    <div class="tray rounded-md px-2 py-2 space-y-1">
        <div class="row" title="Boats in the supply, including the one blocked by a loan">
            <span>Boats left</span>
            <span class="num" data-testid="boats-left">{playerState.boats}</span>
        </div>
        <div class="row" title="Boats on sea spaces and on captured ships">
            <span>Boats out</span>
            <span class="num">{onBoard} on spaces, {onShips.length} on ships</span>
        </div>
        <div class="row" title="Loans are repaid at the end at double value">
            <span>Loan</span>
            <span class="num" data-testid="loan"
                >{playerState.loans}{playerState.blockedBoats > 0 ? ' (1 boat blocked)' : ''}</span
            >
        </div>
        <div class="row">
            <span>Captured ships</span>
            <span class="num" data-testid="captured-ships"
                >{ships.length === 0
                    ? 'none'
                    : ships.map((value) => shipLabel(value)).join('  ')}</span
            >
        </div>
        <div class="row" title="Only the owner can see which cards they are">
            <span>Cards in hand</span>
            <span class="num" data-testid="card-counts"
                >{playerState.seaCount} sea, {playerState.dutchmanCount} Dutchman</span
            >
        </div>
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
        gap: 8px;
        font-size: 0.8rem;
    }
    .num {
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        text-align: right;
    }
</style>
