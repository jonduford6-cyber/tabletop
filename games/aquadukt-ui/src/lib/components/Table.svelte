<script lang="ts">
    import {
        ScalingWrapper,
        DefaultTabs,
        HistoryControls,
        DefaultTableLayout,
        GameSession
    } from '@tabletop/frontend-components'
    import type { AquaduktGameState, HydratedAquaduktGameState } from '@tabletop/aquadukt'
    import type { AquaduktGameSession } from '$lib/stores/AquaduktGameSession.svelte'
    import { setGameSession } from '$lib/model/gameSessionContext.svelte.js'
    import Board from './Board.svelte'
    import ActionPanel from './ActionPanel.svelte'
    import GameEndPanel from './GameEndPanel.svelte'
    import Header from './Header.svelte'
    import History from './History.svelte'
    import HistoryDescription from './HistoryDescription.svelte'
    import PlayersPanel from './PlayersPanel.svelte'
    import WaitingPanel from './WaitingPanel.svelte'

    let {
        gameSession
    }: { gameSession: GameSession<AquaduktGameState, HydratedAquaduktGameState> } = $props()

    // svelte-ignore state_referenced_locally
    setGameSession(gameSession as AquaduktGameSession)
</script>

<DefaultTableLayout>
    {#snippet sideContent()}
        <div class="max-sm:hidden">
            <HistoryControls />
        </div>
        <DefaultTabs>
            {#snippet playersPanel()}
                <PlayersPanel />
            {/snippet}
            {#snippet history()}
                <History />
            {/snippet}
        </DefaultTabs>
    {/snippet}
    {#snippet gameContent()}
        <div class="shrink-0">
            <Header />
            {#if gameSession.gameState.result}
                <GameEndPanel />
            {:else if gameSession.isViewingHistory}
                <HistoryDescription />
            {:else if gameSession.isPlayable}
                {#if gameSession.isMyTurn}
                    <ActionPanel />
                {:else}
                    <WaitingPanel />
                {/if}
            {/if}
        </div>
        <div class="grow-0 overflow-hidden min-h-[200px]" style="flex:1;">
            <ScalingWrapper justify="center" controls="top-right">
                <div class="w-fit h-fit">
                    <Board />
                </div>
            </ScalingWrapper>
        </div>
    {/snippet}
</DefaultTableLayout>
