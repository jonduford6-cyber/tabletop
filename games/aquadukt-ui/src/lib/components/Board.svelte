<script lang="ts">
    import {
        ActionType,
        Board as BoardModel,
        allEdges,
        allIntersections,
        squareKey,
        type Edge
    } from '@tabletop/aquadukt'
    import { getGameSession } from '$lib/model/gameSessionContext.svelte.js'
    import {
        BOARD_HEIGHT,
        BOARD_WIDTH,
        CELL,
        cornerRockSquares,
        edgeSegment,
        intersectionPoint,
        offsetSegment,
        regionBorders,
        regionLabelPosition,
        regionTint,
        squareOrigin
    } from '$lib/utils/boardLayout.js'

    const gameSession = getGameSession()

    const squares = BoardModel.playableSquares
    const borders = regionBorders()
    const rocks = cornerRockSquares()
    const edges = allEdges()
    const intersections = allIntersections()
    const regionLabels = Array.from({ length: 20 }, (_, index) => {
        const region = index + 1
        return { region, ...regionLabelPosition(region) }
    })

    const state = $derived(gameSession.gameState)
    const mode = $derived(gameSession.chosenAction)
    const rolledRegion = $derived(state.rolledRegion)
    const interactive = $derived(gameSession.canActOnBoard)
    const houses = $derived(state.houses)
    const mountainKeys = $derived(new Set(state.mountains.map(squareKey)))
    const suppliedKeys = $derived(gameSession.suppliedSquares)

    function edgeLabel(edge: Edge): string {
        return `${edge.orientation} edge ${edge.row},${edge.col}`
    }

    function activate(event: KeyboardEvent, action: () => void) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            action()
        }
    }
</script>

<svg
    class="board block select-none"
    viewBox="0 0 {BOARD_WIDTH} {BOARD_HEIGHT}"
    width={BOARD_WIDTH}
    height={BOARD_HEIGHT}
    role="group"
    aria-label="Aquädukt board"
>
    <rect width={BOARD_WIDTH} height={BOARD_HEIGHT} rx="18" fill="#6b4a25"></rect>
    <rect x="8" y="8" width={BOARD_WIDTH - 16} height={BOARD_HEIGHT - 16} rx="12" fill="#a9d18a"
    ></rect>

    {#each squares as square (squareKey(square))}
        {@const { x, y } = squareOrigin(square)}
        {@const region = BoardModel.regionOf(square)}
        <rect {x} {y} width={CELL} height={CELL} fill={regionTint(region)}></rect>
        {#if rolledRegion !== undefined && region !== rolledRegion}
            <rect {x} {y} width={CELL} height={CELL} fill="#000000" opacity="0.38"></rect>
        {:else if rolledRegion !== undefined}
            <rect {x} {y} width={CELL} height={CELL} fill="#fde047" opacity="0.35"></rect>
        {/if}
        {#if suppliedKeys.has(squareKey(square))}
            <rect
                x={x + 2}
                y={y + 2}
                width={CELL - 4}
                height={CELL - 4}
                rx="6"
                fill="#38bdf8"
                opacity="0.3"
                stroke="#0ea5e9"
                stroke-width="2"
                stroke-dasharray="5 3"
            ></rect>
        {/if}
    {/each}

    {#each rocks as rock (squareKey(rock))}
        {@const { x, y } = squareOrigin(rock)}
        <g transform="translate({x} {y})" data-testid="corner-rock">
            <polygon
                points="4,50 10,22 26,8 44,12 56,30 50,54 22,56"
                fill="#8a8f98"
                stroke="#4b4f55"
                stroke-width="2.5"
                stroke-linejoin="round"
            ></polygon>
            <polygon points="26,8 44,12 38,28 22,24" fill="#b7bcc4"></polygon>
            <polygon points="10,22 22,24 20,44 4,50" fill="#6e737b"></polygon>
        </g>
    {/each}

    {#each state.mountains as mountain (squareKey(mountain))}
        {@const { x, y } = squareOrigin(mountain)}
        <g transform="translate({x} {y})" data-testid="mountain">
            <polygon
                points="8,50 30,10 52,50"
                fill="#7b7f86"
                stroke="#43464c"
                stroke-width="2.5"
                stroke-linejoin="round"
            ></polygon>
            <polygon points="30,10 38,24 30,21 23,25" fill="#f3f4f6"></polygon>
        </g>
    {/each}

    {#each squares as square (squareKey(square))}
        {#if suppliedKeys.has(squareKey(square)) && !mountainKeys.has(squareKey(square))}
            {@const { x, y } = squareOrigin(square)}
            <g
                transform="translate({x + 11} {y + 13})"
                data-testid="supplied-marker"
                pointer-events="none"
            >
                <path
                    d="M0,-8 C5,-1 7,2 7,5 A7 7 0 0 1 -7 5 C-7,2 -5,-1 0,-8 Z"
                    fill="#0284c7"
                    stroke="#ffffff"
                    stroke-width="1.8"
                ></path>
            </g>
        {/if}
    {/each}

    {#each borders as border, index (index)}
        <line
            x1={border.x1}
            y1={border.y1}
            x2={border.x2}
            y2={border.y2}
            stroke="#4a3216"
            stroke-width="4.5"
            stroke-linecap="round"
        ></line>
    {/each}
    {#if rolledRegion !== undefined}
        {#each borders.filter((border) => border.region === rolledRegion) as border, index (index)}
            <line
                x1={border.x1}
                y1={border.y1}
                x2={border.x2}
                y2={border.y2}
                stroke="#facc15"
                stroke-width="5"
                stroke-linecap="round"
            ></line>
        {/each}
    {/if}

    {#each houses as house (squareKey(house))}
        {@const { x, y } = squareOrigin(house)}
        {@const fill = gameSession.colors.getPlayerUiColor(house.playerId)}
        {@const ink = gameSession.colors.getPlayerTextColorValue(house.playerId)}
        <g transform="translate({x} {y})" data-testid="house" pointer-events="none">
            <rect
                x="7"
                y="7"
                width={CELL - 14}
                height={CELL - 14}
                rx="9"
                {fill}
                stroke="#1f2937"
                stroke-width="2.5"
            ></rect>
            <text
                x={CELL / 2}
                y="29"
                text-anchor="middle"
                dominant-baseline="central"
                font-size="26"
                font-weight="800"
                fill={ink}>{house.value}</text
            >
            {#each Array.from({ length: house.value }, (_, i) => i) as pip (pip)}
                <circle cx={CELL / 2 + (pip - (house.value - 1) / 2) * 9} cy="46" r="3" fill={ink}
                ></circle>
            {/each}
            <title
                >{gameSession.getPlayerName(house.playerId)}: {house.value}-house tile{suppliedKeys.has(
                    squareKey(house)
                )
                    ? ' (supplied with water)'
                    : ' (no water yet)'}</title
            >
        </g>
    {/each}

    {#each state.canals as canal (`${canal.orientation}${canal.row},${canal.col}`)}
        {@const segment = edgeSegment(canal)}
        {#if canal.count >= 2}
            {#each [-6, 6] as offset (offset)}
                {@const lane = offsetSegment(segment, offset, canal)}
                <line {...lane} stroke="#082f5c" stroke-width="11" stroke-linecap="butt"></line>
                <line {...lane} stroke="#1d6fd1" stroke-width="7" stroke-linecap="butt"></line>
            {/each}
        {:else}
            <line {...segment} stroke="#0b4f8a" stroke-width="12" stroke-linecap="butt"></line>
            <line {...segment} stroke="#7dd3fc" stroke-width="8" stroke-linecap="butt"></line>
        {/if}
        <title>{canal.count >= 2 ? 'Double canal' : 'Single canal'}</title>
    {/each}

    {#each state.springs as spring (squareKey(spring))}
        {@const point = intersectionPoint(spring)}
        <g data-testid="spring" pointer-events="none">
            <circle
                cx={point.x}
                cy={point.y}
                r="14"
                fill="#0369a1"
                stroke="#ffffff"
                stroke-width="3.5"
            ></circle>
            <circle cx={point.x} cy={point.y} r="7" fill="#38bdf8"></circle>
            <circle cx={point.x - 2.5} cy={point.y - 2.5} r="2.2" fill="#ffffff"></circle>
            <title>Spring</title>
        </g>
    {/each}

    {#each regionLabels as label (label.region)}
        <g pointer-events="none" data-testid="region-label">
            <circle
                cx={label.x}
                cy={label.y}
                r="12"
                fill="#fff7e0"
                stroke="#4a3216"
                stroke-width="2"
                opacity="0.95"
            ></circle>
            <text
                x={label.x}
                y={label.y + 0.5}
                text-anchor="middle"
                dominant-baseline="central"
                font-size="13"
                font-weight="700"
                fill="#4a3216">{label.region}</text
            >
        </g>
    {/each}

    {#if interactive && mode === ActionType.PlaceHouse}
        {#each squares as square (squareKey(square))}
            {@const { x, y } = squareOrigin(square)}
            {@const status = gameSession.squareStatus(square)}
            <g
                role="button"
                tabindex={status.legal ? 0 : -1}
                aria-disabled={!status.legal}
                aria-label="Square {square.row},{square.col}"
                class={status.legal ? 'target legal' : 'target illegal'}
                data-testid={status.legal ? 'house-target-legal' : 'house-target-illegal'}
                onclick={() => gameSession.placeHouse(square)}
                onkeydown={(event) => activate(event, () => gameSession.placeHouse(square))}
            >
                <rect
                    x={x + 3}
                    y={y + 3}
                    width={CELL - 6}
                    height={CELL - 6}
                    rx="8"
                    fill={status.legal ? '#facc15' : 'transparent'}
                    fill-opacity={status.legal ? 0.4 : 0}
                    stroke={status.legal ? '#a16207' : 'none'}
                    stroke-width="3"
                ></rect>
                {#if !status.legal && status.reason}<title>{status.reason}</title>{/if}
            </g>
        {/each}
    {:else if interactive && mode === ActionType.PlaceSpring}
        {#each intersections as point (squareKey(point))}
            {@const { x, y } = intersectionPoint(point)}
            {@const status = gameSession.intersectionStatus(point)}
            <g
                role="button"
                tabindex={status.legal ? 0 : -1}
                aria-disabled={!status.legal}
                aria-label="Intersection {point.row},{point.col}"
                class={status.legal ? 'target legal' : 'target illegal'}
                data-testid={status.legal ? 'spring-target-legal' : 'spring-target-illegal'}
                onclick={() => gameSession.placeSpring(point)}
                onkeydown={(event) => activate(event, () => gameSession.placeSpring(point))}
            >
                <circle cx={x} cy={y} r="13" fill="transparent"></circle>
                <circle
                    class="marker"
                    cx={x}
                    cy={y}
                    r={status.legal ? 9 : 3.5}
                    fill={status.legal ? '#facc15' : '#000000'}
                    fill-opacity={status.legal ? 1 : 0.35}
                    stroke={status.legal ? '#a16207' : 'none'}
                    stroke-width="3"
                ></circle>
                {#if !status.legal && status.reason}<title>{status.reason}</title>{/if}
            </g>
        {/each}
    {:else if interactive && mode === ActionType.PlaceCanal}
        {#each edges as edge (`${edge.orientation}${edge.row},${edge.col}`)}
            {@const segment = edgeSegment(edge)}
            {@const status = gameSession.edgeStatus(edge)}
            <g
                role="button"
                tabindex={status.legal ? 0 : -1}
                aria-disabled={!status.legal}
                aria-label={edgeLabel(edge)}
                class={status.legal ? 'target legal' : 'target illegal'}
                data-testid={status.legal ? 'canal-target-legal' : 'canal-target-illegal'}
                onclick={() => gameSession.placeCanal(edge)}
                onkeydown={(event) => activate(event, () => gameSession.placeCanal(edge))}
            >
                <line {...segment} stroke="transparent" stroke-width="22"></line>
                <line
                    class="marker"
                    {...segment}
                    stroke={status.legal ? '#facc15' : '#000000'}
                    stroke-opacity={status.legal ? 0.95 : 0.12}
                    stroke-width={status.legal ? 11 : 2}
                    stroke-linecap="round"
                    stroke-dasharray={status.legal ? undefined : '4 5'}
                ></line>
                {#if !status.legal && status.reason}<title>{status.reason}</title>{/if}
            </g>
        {/each}
    {/if}
</svg>

<style>
    .target {
        outline: none;
    }
    .legal {
        cursor: pointer;
    }
    .illegal {
        cursor: not-allowed;
    }
    .legal:hover .marker,
    .legal:focus .marker {
        filter: brightness(1.15) drop-shadow(0 0 4px #fde047);
    }
    .legal:hover rect,
    .legal:focus rect {
        fill-opacity: 0.65;
    }
</style>
