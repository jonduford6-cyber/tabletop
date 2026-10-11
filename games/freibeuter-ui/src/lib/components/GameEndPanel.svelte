<script lang="ts">
    import { winnersOf } from '@tabletop/freibeuter'
    import { PlayerName } from '@tabletop/frontend-components'
    import { getGameSession } from '$lib/model/gameSessionContext.svelte.js'
    import { endReasonText } from '$lib/utils/actionDescriptions.js'
    import { breakdownOf, rankBreakdowns } from '$lib/utils/outcome.js'
    import { shipLabel } from '$lib/utils/boardGeometry.js'

    const gameSession = getGameSession()

    const state = $derived(gameSession.gameState)
    const rows = $derived(
        rankBreakdowns(state.players.map((player) => breakdownOf(player, state.removedDoublings)))
    )
    const winnerIds = $derived(winnersOf(state.players, state.removedDoublings))
    const winners = $derived(new Set(winnerIds))
</script>

<div
    class="mb-2 flex flex-col items-center gap-3 rounded-md px-2 sm:px-4 pt-3 pb-4 bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
    data-testid="game-end-panel"
>
    <div class="flex flex-col items-center gap-0.5">
        <h1 class="text-2xl font-bold">Game over</h1>
        <p class="text-lg" data-testid="winner-line">
            {#each winnerIds as winnerId, index (winnerId)}
                {#if index > 0}<span> and </span>{/if}
                <PlayerName playerId={winnerId} />
            {/each}
            {winnerIds.length > 1 ? 'share the win' : 'wins'}
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-300" data-testid="end-reason">
            {endReasonText(state.endReason)}
        </p>
        {#if state.surrounded.length > 0}
            <p class="text-sm text-gray-600 dark:text-gray-300">
                {state.surrounded.length} surrounded
                {state.surrounded.length === 1 ? 'entity was' : 'entities were'} left unresolved.
            </p>
        {/if}
    </div>
    <table class="sheet">
        <thead>
            <tr>
                <th></th>
                <th>Treasure</th>
                <th>Ships</th>
                <th title="Twice the loan is subtracted">Loans</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            {#each rows as row (row.playerId)}
                <tr class={winners.has(row.playerId) ? 'winner' : ''} data-testid="end-row">
                    <td class="who">
                        <span
                            class="dot"
                            style:background={gameSession.colors.getPlayerUiColor(row.playerId)}
                        ></span>
                        {gameSession.getPlayerName(row.playerId)}
                        {#if winners.has(row.playerId)}<span class="star">&#x2605;</span>{/if}
                    </td>
                    <td class="num">{row.treasure}</td>
                    <td class="num" data-testid="ship-breakdown">
                        {#if row.ships.length === 0}0{:else}
                            {#each row.ships as ship, index (index)}
                                <div class="small">
                                    {shipLabel(ship.value)}
                                    {ship.doubled ? `doubled = ${ship.worth}` : `= ${ship.worth}`}
                                </div>
                            {/each}
                            <div>{row.shipTotal}</div>
                        {/if}
                    </td>
                    <td class="num">{row.loans > 0 ? `${row.loans} x2 = -${row.loanCost}` : '0'}</td
                    >
                    <td class="num total" data-testid="total">{row.total}</td>
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
        padding: 0 10px 4px;
        font-size: 0.8rem;
        font-weight: 500;
        color: #6b7280;
    }
    td {
        padding: 4px 10px;
        border-top: 1px solid rgba(0, 0, 0, 0.12);
        vertical-align: top;
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
        font-weight: 700;
        font-variant-numeric: tabular-nums;
    }
    .small {
        font-size: 0.72rem;
        font-weight: 500;
    }
    .total {
        font-size: 1.2rem;
    }
    .winner td {
        background: rgba(250, 204, 21, 0.18);
    }
    .star {
        color: #d97706;
    }
</style>
