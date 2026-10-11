<script lang="ts">
    import { CounterKind } from '@tabletop/freibeuter'
    import { getGameSession } from '$lib/model/gameSessionContext.svelte.js'
    import { shipLabel } from '$lib/utils/boardGeometry.js'
    import { recentResolutions } from '$lib/utils/recentResolutions.js'

    const gameSession = getGameSession()

    const resolutions = $derived(recentResolutions(gameSession.actions))

    function title(kind: CounterKind, value?: number, captured?: boolean): string {
        if (kind === CounterKind.Ship) {
            return captured
                ? `Ship ${shipLabel(value ?? 0)} taken`
                : `Ship ${shipLabel(value ?? 0)} removed`
        }
        return kind === CounterKind.Chest
            ? 'Pirate chest removed'
            : `Doubling counter ${value} removed`
    }
</script>

{#if resolutions.length > 0}
    <div
        class="mb-2 flex flex-row flex-wrap justify-center gap-x-6 gap-y-2 rounded-md px-3 py-2 bg-amber-100 text-gray-900 dark:bg-amber-900/40 dark:text-gray-100"
        data-testid="resolution-reveal"
    >
        {#each resolutions as resolution (resolution.id)}
            {@const data = resolution.metadata}
            {#if data}
                <div class="flex flex-col items-center text-sm" data-testid="resolution">
                    <span class="font-semibold"
                        >{title(data.kind, data.value, data.captorId !== undefined)}</span
                    >
                    {#if data.kind === CounterKind.Ship && data.captorId === undefined}
                        <span>Not captured: nobody is paid.</span>
                    {/if}
                    {#if data.kind === CounterKind.Ship && data.captorId !== undefined}
                        <span
                            >Taken by <b>{gameSession.getPlayerName(data.captorId)}</b>, who pays:</span
                        >
                    {/if}
                    {#if data.kind === CounterKind.Chest}
                        <span>The bank pays each player around it:</span>
                    {/if}
                    {#each data.payments as payment (payment.playerId)}
                        <span data-testid="payment"
                            ><b>{gameSession.getPlayerName(payment.playerId)}</b> receives
                            {payment.amount}</span
                        >
                    {/each}
                    {#if data.kind === CounterKind.Ship && data.captorId !== undefined && data.payments.length === 0}
                        <span>Nobody else had boats around it.</span>
                    {/if}
                    {#if data.loan > 0}
                        <span class="loan" data-testid="loan-taken"
                            >{gameSession.getPlayerName(data.captorId)} borrowed {data.loan} from the
                            bank (repaid at double at the end)</span
                        >
                    {/if}
                </div>
            {/if}
        {/each}
    </div>
{/if}

<style>
    .loan {
        font-weight: 600;
        color: #b45309;
    }
</style>
