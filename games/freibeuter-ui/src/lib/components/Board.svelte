<script lang="ts">
    import { board } from '@tabletop/freibeuter'
    import { getGameSession } from '$lib/model/gameSessionContext.svelte.js'
    import {
        BOARD_HEIGHT,
        BOARD_WIDTH,
        CELL,
        GRID_SIZE,
        MARGIN_BOTTOM,
        MARGIN_TOP,
        MARGIN_X,
        boatOffsets,
        columnLabelX,
        intersectionPoint,
        rowLabelY,
        spaceCenter,
        spaceOrigin
    } from '$lib/utils/boardGeometry.js'
    import Boat from './Boat.svelte'
    import CounterToken from './CounterToken.svelte'

    const gameSession = getGameSession()

    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
    const columns = [1, 2, 3, 4, 5, 6, 7]
    const seam = [1, 2, 3, 4, 5, 6]
    const checker = 12

    const state = $derived(gameSession.gameState)
    const boatsBySpace = $derived.by(() => {
        const grouped = new Map<string, string[]>()
        for (const boat of state.placedBoats) {
            grouped.set(boat.space, [...(grouped.get(boat.space) ?? []), boat.playerId])
        }
        return grouped
    })
    const legalSpaces = $derived(new Set(gameSession.legalSpaces))
    const dutchman = $derived(state.dutchmanAt)

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
    aria-label="Freibeuter board"
>
    <defs>
        <pattern
            id="fb-checker"
            width={checker * 2}
            height={checker * 2}
            patternUnits="userSpaceOnUse"
        >
            <rect width={checker * 2} height={checker * 2} fill="#ffffff"></rect>
            <rect width={checker} height={checker} fill="#111111"></rect>
            <rect x={checker} y={checker} width={checker} height={checker} fill="#111111"></rect>
        </pattern>
    </defs>

    <rect width={BOARD_WIDTH} height={BOARD_HEIGHT} rx="6" fill="url(#fb-checker)"></rect>
    <rect
        x={checker}
        y={checker}
        width={BOARD_WIDTH - 2 * checker}
        height={BOARD_HEIGHT - 2 * checker}
        fill="#ecdcb0"
        stroke="#7a5a2a"
        stroke-width="2"
    ></rect>
    <text
        x={BOARD_WIDTH / 2}
        y="52"
        text-anchor="middle"
        font-size="44"
        font-style="italic"
        font-weight="700"
        font-family="Georgia, 'Palatino Linotype', 'Book Antiqua', serif"
        fill="#5a3b1a"
        opacity="0.8"
        letter-spacing="3"
        pointer-events="none">Freibeuter</text
    >

    <rect x={MARGIN_X} y={MARGIN_TOP} width={GRID_SIZE} height={GRID_SIZE} fill="#d3e9f4"></rect>

    <g opacity="0.2" pointer-events="none" data-testid="decor">
        <path
            d="M 118 200 q 18 -34 60 -26 q 40 8 34 36 q -6 30 -44 30 q -46 0 -50 -40 Z"
            fill="#c9a66b"
        ></path>
        <path
            d="M 560 150 q 30 -26 66 -8 q 26 14 12 38 q -16 22 -52 14 q -34 -10 -26 -44 Z"
            fill="#c9a66b"
        ></path>
        <path
            d="M 470 560 q 26 -30 70 -14 q 34 14 20 44 q -18 28 -56 20 q -40 -10 -34 -50 Z"
            fill="#c9a66b"
        ></path>
        <path
            d="M 150 520 q 20 -26 52 -14 q 26 12 14 34 q -14 20 -42 12 q -30 -8 -24 -32 Z"
            fill="#c9a66b"
        ></path>
        {#each [{ x: 110, y: 168 }, { x: 650, y: 168 }, { x: 110, y: 660 }, { x: 650, y: 660 }] as rose (`${rose.x}-${rose.y}`)}
            <g transform="translate({rose.x} {rose.y})">
                <circle r="34" fill="none" stroke="#3b5d78" stroke-width="2"></circle>
                <path d="M 0 -48 L 8 -8 L 48 0 L 8 8 L 0 48 L -8 8 L -48 0 L -8 -8 Z" fill="#3b5d78"
                ></path>
                <path d="M 0 -30 L 4 -4 L 30 0 L 4 4 L 0 30 L -4 4 L -30 0 L -4 -4 Z" fill="#d3e9f4"
                ></path>
            </g>
        {/each}
        {#each [{ x: 360, y: 250 }, { x: 560, y: 420 }, { x: 230, y: 610 }] as ship (`${ship.x}-${ship.y}`)}
            <g transform="translate({ship.x} {ship.y}) scale(1.6)">
                <path d="M -22 0 L 22 0 L 15 12 L -15 12 Z" fill="#3b5d78"></path>
                <line x1="0" y1="0" x2="0" y2="-26" stroke="#3b5d78" stroke-width="2"></line>
                <path d="M 2 -25 L 20 -4 L 2 -4 Z" fill="#3b5d78"></path>
                <path d="M -2 -22 L -16 -4 L -2 -4 Z" fill="#3b5d78"></path>
            </g>
        {/each}
    </g>

    {#each seam as index (index)}
        <line
            x1={MARGIN_X + index * CELL}
            y1={MARGIN_TOP}
            x2={MARGIN_X + index * CELL}
            y2={MARGIN_TOP + GRID_SIZE}
            stroke="#4f86b3"
            stroke-width="1.5"
            stroke-dasharray="7 6"
            pointer-events="none"
        ></line>
        <line
            x1={MARGIN_X}
            y1={MARGIN_TOP + index * CELL}
            x2={MARGIN_X + GRID_SIZE}
            y2={MARGIN_TOP + index * CELL}
            stroke="#4f86b3"
            stroke-width="1.5"
            stroke-dasharray="7 6"
            pointer-events="none"
        ></line>
    {/each}
    <rect
        x={MARGIN_X}
        y={MARGIN_TOP}
        width={GRID_SIZE}
        height={GRID_SIZE}
        fill="none"
        stroke="#4f86b3"
        stroke-width="2.5"
        pointer-events="none"
    ></rect>

    {#each rows as row, index (row)}
        <text
            x={MARGIN_X / 2 + 2}
            y={rowLabelY(index)}
            text-anchor="middle"
            dominant-baseline="central"
            font-size="30"
            font-weight="700"
            font-family="Georgia, serif"
            fill="#3b2a14">{row}</text
        >
        <text
            x={BOARD_WIDTH - MARGIN_X / 2 - 2}
            y={rowLabelY(index)}
            text-anchor="middle"
            dominant-baseline="central"
            font-size="30"
            font-weight="700"
            font-family="Georgia, serif"
            fill="#3b2a14">{row}</text
        >
    {/each}
    {#each columns as column, index (column)}
        <text
            x={columnLabelX(index)}
            y={MARGIN_TOP - 20}
            text-anchor="middle"
            dominant-baseline="central"
            font-size="30"
            font-weight="700"
            font-family="Georgia, serif"
            fill="#3b2a14">{column}</text
        >
        <text
            x={columnLabelX(index)}
            y={BOARD_HEIGHT - MARGIN_BOTTOM / 2 - 2}
            text-anchor="middle"
            dominant-baseline="central"
            font-size="30"
            font-weight="700"
            font-family="Georgia, serif"
            fill="#3b2a14">{column}</text
        >
    {/each}

    {#each board.spaces as space (space)}
        {@const origin = spaceOrigin(space)}
        {@const status = gameSession.spaceStatus(space)}
        {@const clickable =
            gameSession.isChoosingTurnAction && gameSession.selectedCard !== undefined}
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <g
            data-testid="space"
            data-space={space}
            role={clickable ? 'button' : undefined}
            tabindex={clickable ? 0 : undefined}
            aria-label={`Sea space ${space}`}
            style:cursor={clickable ? 'pointer' : 'default'}
            onclick={() => gameSession.clickSpace(space)}
            onkeydown={(event) => activate(event, () => gameSession.clickSpace(space))}
        >
            <title
                >{clickable ? (status.reason ?? `Sea space ${space}`) : `Sea space ${space}`}</title
            >
            <rect
                x={origin.x}
                y={origin.y}
                width={CELL}
                height={CELL}
                fill={legalSpaces.has(space) ? '#fde047' : 'transparent'}
                fill-opacity={legalSpaces.has(space) ? 0.38 : 0}
                stroke={legalSpaces.has(space) ? '#eab308' : 'none'}
                stroke-width="4"
                data-testid={legalSpaces.has(space) ? 'target-space' : undefined}
            ></rect>
            <text
                x={origin.x + CELL - 8}
                y={origin.y + CELL - 8}
                text-anchor="end"
                font-size="11"
                fill="#2f5d7c"
                opacity="0.55"
                pointer-events="none">{space}</text
            >
        </g>
    {/each}

    {#each board.intersections as intersection (intersection.id)}
        {@const point = intersectionPoint(intersection.id)}
        <circle
            cx={point.x}
            cy={point.y}
            r="31"
            fill="none"
            stroke="#4f86b3"
            stroke-width="1.4"
            pointer-events="none"
        ></circle>
    {/each}

    <g pointer-events="none">
        {#each [...boatsBySpace.entries()] as [space, owners] (space)}
            {@const center = spaceCenter(space)}
            {@const offsets = boatOffsets(owners.length)}
            {#each owners as owner, index (index)}
                <Boat
                    x={center.x + offsets[index].x}
                    y={center.y + offsets[index].y}
                    fill={gameSession.colors.getPlayerUiColor(owner)}
                />
            {/each}
        {/each}
    </g>

    {#each state.counters as counter (counter.intersection)}
        {@const point = intersectionPoint(counter.intersection)}
        {@const status = gameSession.counterStatus(counter.intersection)}
        {@const surrounded = state.surrounded.includes(counter.intersection)}
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <g
            data-testid="counter-place"
            data-intersection={counter.intersection}
            role={status.legal ? 'button' : undefined}
            tabindex={status.legal ? 0 : undefined}
            aria-label={`Counter at ${counter.intersection}`}
            style:cursor={status.legal ? 'pointer' : 'default'}
            style:pointer-events={status.legal ? 'auto' : 'none'}
            onclick={() => gameSession.clickCounter(counter.intersection)}
            onkeydown={(event) =>
                activate(event, () => gameSession.clickCounter(counter.intersection))}
        >
            <title>{status.reason ?? `Counter at ${counter.intersection}`}</title>
            {#if status.legal || surrounded}
                <circle
                    cx={point.x}
                    cy={point.y}
                    r="38"
                    fill="#fde047"
                    fill-opacity="0.45"
                    stroke={surrounded ? '#f97316' : '#eab308'}
                    stroke-width="5"
                    data-testid={surrounded ? 'surrounded-counter' : 'capture-target'}
                ></circle>
            {/if}
            <CounterToken x={point.x} y={point.y} kind={counter.kind} value={counter.value} />
            {#if counter.captorId}
                <Boat
                    x={point.x}
                    y={point.y - 12}
                    fill={gameSession.colors.getPlayerUiColor(counter.captorId)}
                    scale={1.15}
                />
            {/if}
        </g>
    {/each}

    {#if dutchman}
        {@const center = spaceCenter(dutchman)}
        <g pointer-events="none">
            <Boat x={center.x} y={center.y - 6} fill="#e8edf2" scale={1.8} ghost={true} />
        </g>
    {/if}
</svg>
