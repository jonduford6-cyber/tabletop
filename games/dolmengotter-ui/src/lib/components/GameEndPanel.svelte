<script lang="ts">
    import { PlayerName } from '@tabletop/frontend-components'
    import { getGameSession } from '$lib/model/gameSessionContext.svelte.js'
    import { describeOutcome, rankStandings } from '$lib/utils/outcome.js'

    const gameSession = getGameSession()

    const standings = $derived(gameSession.gameState.players)
    const outcome = $derived(describeOutcome(standings))
    const winners = $derived(new Set(outcome.winnerIds))
    const ranked = $derived(rankStandings(standings))
    const explanation = $derived.by(() => {
        switch (outcome.basis) {
            case 'points':
                return 'Most victory points.'
            case 'dolmens':
                return 'Tied on points; the player who built the most dolmens wins.'
            default:
                return 'Tied on points and on dolmens built: a shared win.'
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
        <p class="text-sm text-gray-600 dark:text-gray-300" data-testid="tie-break">
            {explanation}
        </p>
    </div>
    <table class="sheet">
        <thead>
            <tr>
                <th></th>
                <th title="Victory points: the field of the scoring marker">Points</th>
                <th title="Dolmens placed during the game, used to break ties">Dolmens built</th>
            </tr>
        </thead>
        <tbody>
            {#each ranked as standing (standing.playerId)}
                <tr class={winners.has(standing.playerId) ? 'winner' : ''} data-testid="end-row">
                    <td class="who">
                        <span
                            class="dot"
                            style:background={gameSession.colors.getPlayerUiColor(
                                standing.playerId
                            )}
                        ></span>
                        {gameSession.getPlayerName(standing.playerId)}
                        {#if winners.has(standing.playerId)}<span class="star">&#x2605;</span>{/if}
                    </td>
                    <td class="num">{standing.points}</td>
                    <td class="num">{standing.dolmensPlaced}</td>
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
