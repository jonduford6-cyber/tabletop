<script lang="ts">
    import { getGameSession } from '$lib/model/gameSessionContext.svelte.js'
    import PlayerState from './PlayerState.svelte'
    import Piles from './Piles.svelte'
    import Tray from './Tray.svelte'

    const gameSession = getGameSession()

    const rows = $derived(
        gameSession.gameState.turnManager.turnOrder.map((playerId) => ({
            playerId,
            playerState: gameSession.gameState.getPlayerState(playerId)
        }))
    )
</script>

<div class="space-y-2.5 grow-0 shrink-0">
    {#each rows as row (row.playerId)}
        <PlayerState playerId={row.playerId} playerState={row.playerState} />
    {/each}
    <Piles />
    <Tray />
</div>
