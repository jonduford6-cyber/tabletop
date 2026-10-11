<script lang="ts">
    let {
        x,
        y,
        fill,
        scale = 1,
        ghost = false
    }: { x: number; y: number; fill: string; scale?: number; ghost?: boolean } = $props()
</script>

<g transform="translate({x} {y}) scale({scale})" data-testid={ghost ? 'dutchman' : 'boat'}>
    {#if ghost}
        <g opacity="0.88">
            <path
                d="M -17 2 L 17 2 L 11 12 L -11 12 Z"
                fill="#e8edf2"
                stroke="#7b8794"
                stroke-width="1.5"
                stroke-dasharray="3 2"
            ></path>
            <line x1="0" y1="2" x2="0" y2="-20" stroke="#7b8794" stroke-width="1.5"></line>
            <path
                d="M 1 -19 L 15 -2 L 1 -2 Z"
                fill="#f8fafc"
                stroke="#7b8794"
                stroke-width="1.2"
                stroke-dasharray="3 2"
            ></path>
            <circle cx="-8" cy="-8" r="5" fill="#ffffff" stroke="#374151" stroke-width="1.2"
            ></circle>
            <circle cx="-9.8" cy="-8.6" r="1.1" fill="#111827"></circle>
            <circle cx="-6.2" cy="-8.6" r="1.1" fill="#111827"></circle>
            <path d="M -9.5 -5.2 h 3" stroke="#111827" stroke-width="1"></path>
        </g>
    {:else}
        <path
            d="M -15 2 L 15 2 L 10 11 L -10 11 Z"
            {fill}
            stroke="#1f2937"
            stroke-width="1.8"
            stroke-linejoin="round"
        ></path>
        <line x1="0" y1="2" x2="0" y2="-17" stroke="#3b2a14" stroke-width="1.8"></line>
        <path d="M 1 -16 L 12 -3 L 1 -3 Z" fill="#fdf6e3" stroke="#3b2a14" stroke-width="1.2"
        ></path>
    {/if}
</g>
