<script lang="ts">
    import { tallyPlayers } from '@tabletop/aquadukt'
    import { PlayerName } from '@tabletop/frontend-components'
    import { getGameSession } from '$lib/model/gameSessionContext.svelte.js'
    import { describeOutcome } from '$lib/utils/outcome.js'

    const gameSession = getGameSession()

    const tallies = $derived(tallyPlayers(gameSession.gameState))
    const outcome = $derived(describeOutcome(tallies))
    const winners = $derived(new Set(outcome.winnerIds))
    const ranked = $derived(tallies.toSorted((a, b) => b.houses - a.houses || b.tiles - a.tiles))
    const explanation = $derived.by(() => {
        switch (outcome.basis) {
            case 'houses':
                return 'Most houses supplied with water.'
            case 'tiles':
                return 'Tied on houses; the most supplied tiles breaks the tie.'
            default:
                return 'Tied on both houses and supplied tiles: a shared win.'
        }
    })
</script>

<div
    class="mb-2 flex flex-col items-center gap-3 rounded-md px-2 sm:px-4 pt-3 pb-4 bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
    data-testid="game-end-panel"
>
    <div class="flex flex-col items-center gap-0.5">
        <h1 class="text-2xl font-bold">Game over</h1>
        <p class="text-lg" data-testid="winner-line">
            {#each outcome.winnerIds as winnerId, index (winnerId)}
                {#if index > 0}<span> and </span>{/if}
                <PlayerName playerId={winnerId} />
            {/each}
            {outcome.basis === 'shared' ? 'share the win' : 'wins'}
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-300">{explanation}</p>
    </div>
    <table class="sheet">
        <thead>
            <tr>
                <th></th>
                <th title="Houses on tiles supplied with water">Supplied houses</th>
                <th title="Number of supplied tiles, used to break ties">Supplied tiles</th>
            </tr>
        </thead>
        <tbody>
            {#each ranked as tally (tally.playerId)}
                <tr class={winners.has(tally.playerId) ? 'winner' : ''} data-testid="end-row">
                    <td class="who">
                        <span
                            class="dot"
                            style:background={gameSession.colors.getPlayerUiColor(tally.playerId)}
                        ></span>
                        {gameSession.getPlayerName(tally.playerId)}
                        {#if winners.has(tally.playerId)}<span class="star">&#x2605;</span>{/if}
                    </td>
                    <td class="num">{tally.houses}</td>
                    <td class="num">{tally.tiles}</td>
                </tr>
            {/each}
        </tbody>
    </table>
</div>

<style>
    .sheet {
        border-collapse: collapse;
    }
    th {
        padding: 0 12px 4px;
        font-size: 0.8rem;
        font-weight: 500;
        color: #6b7280;
    }
    td {
        padding: 4px 12px;
        border-top: 1px solid rgba(0, 0, 0, 0.12);
    }
    .who {
        font-weight: 600;
        white-space: nowrap;
    }
    .dot {
        display: inline-block;
        width: 14px;
        height: 14px;
        margin-right: 4px;
        vertical-align: -2px;
        border-radius: 999px;
        border: 2px solid #1f2937;
    }
    .num {
        text-align: center;
        font-size: 1.15rem;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
    }
    .winner td {
        background: rgba(250, 204, 21, 0.18);
    }
    .star {
        color: #d97706;
    }
</style>
