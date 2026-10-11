<script lang="ts">
    import { board } from '@tabletop/dolmengotter'
    import { getGameSession } from '$lib/model/gameSessionContext.svelte.js'

    const gameSession = getGameSession()

    const first = board.scoringTrack.first
    const last = board.scoringTrack.last
    const perRow = 50
    const cell = 22
    const markerRadius = 7
    const fields = Array.from({ length: last - first + 1 }, (_, index) => first + index)
    const width = perRow * cell
    const height = 2 * cell * 1.5

    const players = $derived(gameSession.gameState.players)

    function cellOrigin(field: number): { x: number; y: number } {
        const index = field - first
        return { x: (index % perRow) * cell, y: Math.floor(index / perRow) * cell * 1.5 }
    }

    function markerPosition(field: number, order: number) {
        const clamped = Math.min(Math.max(field, first), last)
        const origin = cellOrigin(clamped)
        const slot = order % 3
        return {
            x: origin.x + cell / 2 + (slot - 1) * 4,
            y: origin.y + cell + 3 + Math.floor(order / 3) * 5
        }
    }
</script>

<div class="track rounded-md px-2 py-2" data-testid="score-track">
    <svg
        viewBox="0 0 {width} {height + 14}"
        class="block w-full"
        role="img"
        aria-label="Scoring track from {first} to {last}"
    >
        {#each fields as field (field)}
            {@const origin = cellOrigin(field)}
            <rect
                x={origin.x + 1}
                y={origin.y}
                width={cell - 2}
                height={cell}
                rx="3"
                fill={field === board.scoringTrack.startField ? '#fde68a' : '#374151'}
                stroke="#6b7280"
                stroke-width="1"
            ></rect>
            <text
                x={origin.x + cell / 2}
                y={origin.y + cell / 2}
                text-anchor="middle"
                dominant-baseline="central"
                font-size="9"
                fill={field === board.scoringTrack.startField ? '#111827' : '#e5e7eb'}>{field}</text
            >
        {/each}
        {#each players as player, order (player.playerId)}
            {@const position = markerPosition(player.points, order)}
            <circle
                cx={position.x}
                cy={position.y}
                r={markerRadius}
                fill={gameSession.colors.getPlayerUiColor(player.playerId)}
                stroke="#ffffff"
                stroke-width="1.5"
                data-testid="track-marker"
                data-player-id={player.playerId}
            ></circle>
        {/each}
    </svg>
    <div class="flex flex-row flex-wrap justify-center gap-x-4 gap-y-1 mt-1">
        {#each players as player (player.playerId)}
            <span class="flex items-center gap-1 text-sm font-semibold" data-testid="track-points">
                <span
                    class="dot"
                    style:background={gameSession.colors.getPlayerUiColor(player.playerId)}
                ></span>
                {gameSession.getPlayerName(player.playerId)}
                <span class="tabular-nums" data-testid="points-{player.playerId}"
                    >{player.points}</span
                >
                {#if player.points > last}<span class="text-xs text-amber-300">(past {last})</span
                    >{/if}
            </span>
        {/each}
    </div>
</div>

<style>
    .track {
        background: #1f2937;
        color: #f3f4f6;
    }
    .dot {
        display: inline-block;
        width: 12px;
        height: 12px;
        border-radius: 999px;
        border: 2px solid #f9fafb;
    }
</style>
