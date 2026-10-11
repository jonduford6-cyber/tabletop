<script lang="ts">
    let {
        value,
        fill,
        ink,
        size = 34,
        dimmed = false
    }: { value: number; fill: string; ink: string; size?: number; dimmed?: boolean } = $props()
</script>

<svg
    viewBox="0 0 40 40"
    width={size}
    height={size}
    role="img"
    aria-label="{value}-house tile"
    class:opacity-35={dimmed}
>
    <rect x="2" y="2" width="36" height="36" rx="7" {fill} stroke="#1f2937" stroke-width="2.5"
    ></rect>
    <text
        x="20"
        y="18"
        text-anchor="middle"
        dominant-baseline="central"
        font-size="19"
        font-weight="800"
        fill={ink}>{value}</text
    >
    {#each Array.from({ length: value }, (_, i) => i) as pip (pip)}
        <circle cx={20 + (pip - (value - 1) / 2) * 6.5} cy="31" r="2.2" fill={ink}></circle>
    {/each}
</svg>
