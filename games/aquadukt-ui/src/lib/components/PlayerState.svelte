<script lang="ts">
    import { TILE_VALUES, type HydratedAquaduktPlayerState } from '@tabletop/aquadukt'
    import { getGameSession } from '$lib/model/gameSessionContext.svelte.js'
    import TileChip from './TileChip.svelte'

    let {
        playerId,
        playerState,
        suppliedHouses,
        suppliedTiles
    }: {
        playerId: string
        playerState: HydratedAquaduktPlayerState
        suppliedHouses: number
        suppliedTiles: number
    } = $props()

    const gameSession = getGameSession()

    const isTurn = $derived(gameSession.gameState.activePlayerIds.includes(playerId))
    const fill = $derived(gameSession.colors.getPlayerUiColor(playerId))
    const ink = $derived(gameSession.colors.getPlayerTextColorValue(playerId))
    const bgClass = $derived(gameSession.colors.getPlayerBgColor(playerId))
    const textClass = $derived(gameSession.colors.getPlayerTextColor(playerId))
</script>

<div
    class="rounded-md px-1.5 pb-1.5 {bgClass} {isTurn ? 'turn' : ''}"
    data-testid="player-panel"
    data-player-id={playerId}
>
    <div class="flex flex-row justify-between items-baseline px-1.5 py-1.5 {textClass}">
        <span class="name">{gameSession.getPlayerName(playerId)}</span>
        <span class="name" title="Houses supplied with water" data-testid="supplied-houses"
            >{suppliedHouses}<span class="unit"> supplied</span></span
        >
    </div>
    <div class="tray rounded-md px-2 py-2">
        <div class="flex flex-row justify-between items-end gap-1">
            {#each TILE_VALUES as value (value)}
                {@const left = playerState.tilesLeft(value)}
                <div
                    class="flex flex-col items-center"
                    title="{left} {value}-house tile{left === 1 ? '' : 's'} left"
                    data-testid="tiles-left-{value}"
                >
                    <TileChip {value} {fill} {ink} size={34} dimmed={left === 0} />
                    <span class="left">&times;{left}</span>
                </div>
            {/each}
        </div>
        <div class="mt-1 text-xs text-gray-300" title="Supplied tiles break ties">
            {suppliedTiles} supplied tile{suppliedTiles === 1 ? '' : 's'}
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
    .left {
        font-size: 0.8rem;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
    }
</style>
