<script lang="ts">
    let {
        x,
        y,
        fill,
        belly = false
    }: { x: number; y: number; fill: string; belly?: boolean } = $props()
</script>

<g transform="translate({x} {y})" data-testid="druid" data-belly={belly}>
    {#if belly}
        <g transform="rotate(90) translate(0 -2)">
            <path d="M -10 12 L 0 -9 L 10 12 Z" {fill} stroke="#111827" stroke-width="2"></path>
            <circle cx="0" cy="-15" r="6" {fill} stroke="#111827" stroke-width="2"></circle>
        </g>
        <path
            d="M 12 -14 q 7 -2 8 -9 q -8 0 -8 9 Z"
            fill="#86efac"
            stroke="#166534"
            stroke-width="1.5"
        ></path>
    {:else}
        <path d="M -10 12 L 0 -9 L 10 12 Z" {fill} stroke="#111827" stroke-width="2"></path>
        <circle cx="0" cy="-15" r="6" {fill} stroke="#111827" stroke-width="2"></circle>
    {/if}
</g>
