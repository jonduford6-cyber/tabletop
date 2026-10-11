<script lang="ts">
    import { CounterKind } from '@tabletop/freibeuter'
    import { shipLabel } from '$lib/utils/boardGeometry.js'

    let { x, y, kind, value }: { x: number; y: number; kind: CounterKind; value?: number } =
        $props()

    const rim = $derived(
        kind === CounterKind.Ship ? '#7fb8dd' : kind === CounterKind.Chest ? '#e8b923' : '#c0392b'
    )
</script>

<g transform="translate({x} {y})" data-testid="counter" data-kind={kind}>
    <circle r="27" fill="#fdf6e3" stroke={rim} stroke-width="5"></circle>
    {#if kind === CounterKind.Ship}
        <path d="M -11 -2 L 11 -2 L 7 5 L -7 5 Z" fill="#8a5a2b" stroke="#3b2a14" stroke-width="1.2"
        ></path>
        <line x1="0" y1="-2" x2="0" y2="-16" stroke="#3b2a14" stroke-width="1.3"></line>
        <path d="M 1 -15 L 10 -4 L 1 -4 Z" fill="#ffffff" stroke="#3b2a14" stroke-width="1"></path>
        <path d="M -1 -15 L -8 -5 L -1 -5 Z" fill="#ffffff" stroke="#3b2a14" stroke-width="1"
        ></path>
        <text
            y="16"
            text-anchor="middle"
            font-size="12"
            font-weight="700"
            fill="#1f2937"
            data-testid="ship-label">{shipLabel(value ?? 0)}</text
        >
    {:else if kind === CounterKind.Chest}
        <rect
            x="-12"
            y="-10"
            width="24"
            height="16"
            rx="2"
            fill="#a0702f"
            stroke="#3b2a14"
            stroke-width="1.3"
        ></rect>
        <path d="M -12 -10 Q 0 -20 12 -10 Z" fill="#b8843b" stroke="#3b2a14" stroke-width="1.3"
        ></path>
        <rect
            x="-2.5"
            y="-6"
            width="5"
            height="6"
            fill="#e8b923"
            stroke="#3b2a14"
            stroke-width="0.8"
        ></rect>
        <text y="19" text-anchor="middle" font-size="10" font-weight="700" fill="#5a3b1a"
            >chest</text
        >
    {:else}
        <text
            y="-3"
            text-anchor="middle"
            font-size="19"
            font-weight="800"
            fill="#c0392b"
            data-testid="doubling-label">x2</text
        >
        <text y="14" text-anchor="middle" font-size="12" font-weight="700" fill="#1f2937"
            >{value}</text
        >
    {/if}
</g>
