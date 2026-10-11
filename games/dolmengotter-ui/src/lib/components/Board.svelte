<script lang="ts">
    import { MachineState, board, placeKey } from '@tabletop/dolmengotter'
    import { getGameSession } from '$lib/model/gameSessionContext.svelte.js'
    import {
        BOARD_HEIGHT,
        BOARD_WIDTH,
        UNIT,
        circleCenter,
        circlePolygon,
        drawnLines,
        numberPosition,
        placePoint,
        runes,
        stackLayout
    } from '$lib/utils/boardGeometry.js'
    import { circleStacks } from '$lib/utils/circleStacks.js'
    import Druid from './Druid.svelte'

    const gameSession = getGameSession()

    const lines = drawnLines()
    const runeMarks = runes()
    const circles = board.circles

    const state = $derived(gameSession.gameState)
    const stacks = $derived(circleStacks(state, gameSession.viewerId))
    const stoneByKey = $derived(new Map(state.stones.map((stone) => [placeKey(stone), stone])))
    const druidByKey = $derived(
        new Map(
            state.players.flatMap((player) =>
                player.druids.map((druid) => [
                    placeKey(druid),
                    { druid, playerId: player.playerId }
                ])
            )
        )
    )
    const rights = $derived(new Set(gameSession.myDolmenRights.map((right) => right.circleId)))
    const decisionCircles = $derived(
        new Set(
            gameSession.machineState === MachineState.DolmenDecision
                ? state.pendingDolmens.map((right) => right.circleId)
                : []
        )
    )
    const destinationKeys = $derived(new Set(gameSession.destinations.map(placeKey)))
    const vacatedKey = $derived(
        gameSession.vacatedPlace ? placeKey(gameSession.vacatedPlace) : undefined
    )

    function activate(event: KeyboardEvent, action: () => void) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            action()
        }
    }

    function targetReason(place: { row: number; col: number }): string | undefined {
        return gameSession.canClickBoard ? gameSession.placeStatus(place).reason : undefined
    }
</script>

<svg
    class="board block select-none"
    viewBox="0 0 {BOARD_WIDTH} {BOARD_HEIGHT}"
    width={BOARD_WIDTH}
    height={BOARD_HEIGHT}
    role="group"
    aria-label="Die Dolmengötter board"
>
    <rect width={BOARD_WIDTH} height={BOARD_HEIGHT} rx="22" fill="#4b3a22"></rect>
    <rect x="9" y="9" width={BOARD_WIDTH - 18} height={BOARD_HEIGHT - 18} rx="16" fill="#cbb98c"
    ></rect>

    {#each circles as circle (circle.id)}
        {@const center = circleCenter(circle)}
        {@const number = numberPosition(circle)}
        <g data-testid="circle" data-circle-id={circle.id}>
            <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
            <polygon
                points={circlePolygon(circle)}
                fill={decisionCircles.has(circle.id) ? '#4ade80' : '#5fa863'}
                stroke={gameSession.chosenCircleId === circle.id
                    ? '#facc15'
                    : rights.has(circle.id)
                      ? '#f97316'
                      : '#2f6b3a'}
                stroke-width={gameSession.chosenCircleId === circle.id || rights.has(circle.id)
                    ? 6
                    : 3}
                stroke-linejoin="round"
                role={rights.has(circle.id) ? 'button' : undefined}
                tabindex={rights.has(circle.id) ? 0 : undefined}
                aria-label={rights.has(circle.id)
                    ? `Choose ${gameSession.circleName(circle.id)}`
                    : undefined}
                style:cursor={rights.has(circle.id) ? 'pointer' : 'default'}
                onclick={() => gameSession.clickCircle(circle.id)}
                onkeydown={(event) => activate(event, () => gameSession.clickCircle(circle.id))}
            ></polygon>
            <text
                x={number.x}
                y={number.y}
                text-anchor="middle"
                dominant-baseline="central"
                font-size={0.34 * UNIT}
                font-weight="700"
                fill="#14391d"
                pointer-events="none"
                data-testid="circle-number">{circle.printedFactor}</text
            >
            <text
                x={center.x}
                y={center.y - (circle.shape === 'tetragonal' ? 0.02 : 0.2) * UNIT}
                text-anchor="middle"
                dominant-baseline="central"
                font-size="10"
                fill="#14391d"
                opacity="0.5"
                pointer-events="none">#{circle.id + 1}</text
            >
        </g>
    {/each}

    {#each lines as line (line.key)}
        <line
            x1={line.from.x}
            y1={line.from.y}
            x2={line.to.x}
            y2={line.to.y}
            stroke="#8a6414"
            stroke-width="2"
            pointer-events="none"
        ></line>
    {/each}

    {#each circles as circle (circle.id)}
        {@const stack = stacks[circle.id].items}
        {@const layout = stackLayout(circle, stack.length)}
        {#each stack.toReversed() as item, indexFromBottom (indexFromBottom)}
            {@const box = layout[indexFromBottom]}
            <g data-testid="dolmen" data-circle-id={circle.id} pointer-events="none">
                <rect
                    x={box.x}
                    y={box.y}
                    width={box.width}
                    height={box.height}
                    rx="3"
                    fill={gameSession.colors.getPlayerUiColor(item.playerId)}
                    stroke="#111827"
                    stroke-width="1.5"
                ></rect>
                {#if item.label !== undefined}
                    <text
                        x={box.x + box.width / 2}
                        y={box.y + box.height / 2}
                        text-anchor="middle"
                        dominant-baseline="central"
                        font-size={box.height * 0.8}
                        font-weight="700"
                        fill={gameSession.colors.getPlayerTextColorValue(item.playerId)}
                        data-testid="dolmen-value">{item.label}</text
                    >
                {/if}
            </g>
        {/each}
    {/each}

    {#each runeMarks as rune (placeKey(rune.place))}
        <text
            x={rune.x}
            y={rune.y}
            text-anchor="middle"
            dominant-baseline="central"
            font-size="19"
            font-weight="700"
            font-family="Georgia, serif"
            fill="#3b2a10"
            stroke="#f5ecd0"
            stroke-width="3"
            paint-order="stroke"
            pointer-events="none"
            data-testid="rune">{rune.symbol}</text
        >
    {/each}

    {#each board.places as place (placeKey(place))}
        {@const key = placeKey(place)}
        {@const point = placePoint(place)}
        {@const stone = stoneByKey.get(key)}
        {@const occupant = druidByKey.get(key)}
        {@const status = gameSession.canClickBoard ? gameSession.placeStatus(place) : undefined}
        {@const eligible = gameSession.isChoosingTurnAction && gameSession.isEligibleDruid(place)}
        {@const reason = targetReason(place)}
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <g
            data-testid="stone-place"
            data-place={key}
            role={gameSession.canClickBoard ? 'button' : undefined}
            tabindex={gameSession.canClickBoard ? 0 : undefined}
            aria-label={`Stone place ${key}`}
            style:cursor={gameSession.canClickBoard ? 'pointer' : 'default'}
            onclick={() => gameSession.clickPlace(place)}
            onkeydown={(event) => activate(event, () => gameSession.clickPlace(place))}
        >
            <title>{reason ?? `Stone place ${key}`}</title>
            <circle
                cx={point.x}
                cy={point.y}
                r="13"
                fill="#e9b949"
                stroke="#8a6414"
                stroke-width="2.5"
            ></circle>
            {#if vacatedKey === key}
                <circle
                    cx={point.x}
                    cy={point.y}
                    r="21"
                    fill="none"
                    stroke="#f97316"
                    stroke-width="4"
                    stroke-dasharray="5 4"
                    data-testid="vacated-place"
                ></circle>
            {/if}
            {#if stone}
                <circle
                    cx={point.x}
                    cy={point.y}
                    r="17"
                    fill={gameSession.colors.getPlayerUiColor(stone.playerId)}
                    stroke="#111827"
                    stroke-width="2.5"
                    data-testid="stone"
                    data-player-id={stone.playerId}
                ></circle>
            {/if}
            {#if occupant}
                <Druid
                    x={point.x}
                    y={point.y}
                    fill={gameSession.colors.getPlayerUiColor(occupant.playerId)}
                    belly={occupant.druid.belly}
                />
            {/if}
            {#if eligible}
                <circle
                    cx={point.x}
                    cy={point.y}
                    r="25"
                    fill="none"
                    stroke={gameSession.isChosenDruid(place) ? '#facc15' : '#38bdf8'}
                    stroke-width={gameSession.isChosenDruid(place) ? 5 : 3}
                    data-testid="eligible-druid"
                ></circle>
            {/if}
            {#if status?.legal && !eligible}
                <circle
                    cx={point.x}
                    cy={point.y}
                    r="22"
                    fill="#fde047"
                    fill-opacity="0.35"
                    stroke="#facc15"
                    stroke-width="4"
                    data-testid="target"
                ></circle>
            {/if}
        </g>
    {/each}
</svg>
