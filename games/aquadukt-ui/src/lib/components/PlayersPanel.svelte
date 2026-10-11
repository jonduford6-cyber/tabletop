<script lang="ts">
    import { tallyPlayers } from '@tabletop/aquadukt'
    import { getGameSession } from '$lib/model/gameSessionContext.svelte.js'
    import PlayerState from './PlayerState.svelte'

    const gameSession = getGameSession()

    const tallies = $derived(tallyPlayers(gameSession.gameState))
    const rows = $derived(
        gameSession.gameState.turnManager.turnOrder.map((playerId) => ({
            playerId,
            playerState: gameSession.gameState.getPlayerState(playerId),
            tally: tallies.find((tally) => tally.playerId === playerId)
        }))
    )
</script>

<div class="space-y-2.5 grow-0 shrink-0">
    {#each rows as row (row.playerId)}
        {#if row.tally}
            <PlayerState
                playerId={row.playerId}
                playerState={row.playerState}
                suppliedHouses={row.tally.houses}
                suppliedTiles={row.tally.tiles}
            />
        {/if}
    {/each}
</div>
