<script lang="ts">
    let { value, size = 56 }: { value?: number; size?: number } = $props()
</script>

<svg
    viewBox="0 0 100 100"
    width={size}
    height={size}
    role="img"
    aria-label={value === undefined ? 'Twenty-sided die' : `Die showing ${value}`}
    data-testid="die"
>
    <polygon
        points="50,4 92,28 92,72 50,96 8,72 8,28"
        fill="#1f2937"
        stroke="#f9fafb"
        stroke-width="4"
        stroke-linejoin="round"
    ></polygon>
    <polygon points="50,4 92,28 50,40 8,28" fill="#374151"></polygon>
    <polygon points="50,40 92,28 92,72" fill="#2b3544"></polygon>
    <polygon points="50,40 8,28 8,72" fill="#2b3544"></polygon>
    <polygon points="50,40 92,72 50,96 8,72" fill="#111827"></polygon>
    {#if value !== undefined}
        <text
            x="50"
            y="62"
            text-anchor="middle"
            dominant-baseline="central"
            font-size={value >= 10 ? 34 : 40}
            font-weight="800"
            fill="#fef3c7">{value}</text
        >
    {/if}
</svg>
