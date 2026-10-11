export const TILE_VALUES = [1, 2, 3, 4] as const

export const NUM_REGIONS = 20
export const NUM_SPRINGS = 5
export const NUM_CANALS = 36
export const MIN_SPRING_DISTANCE = 5
export const MAX_ARMS_PER_SPRING = 2
export const MAX_HOUSES_PER_ROLL_ACTION = 3
export const MAX_CANALS_PER_TURN = 2

type PlayerCountSetup = {
    tilesByValue: readonly number[]
    mountains: number
}

export const SETUP_BY_PLAYER_COUNT: Record<number, PlayerCountSetup> = {
    2: { tilesByValue: [8, 8, 8, 4], mountains: 8 },
    3: { tilesByValue: [7, 7, 7, 4], mountains: 6 },
    4: { tilesByValue: [6, 6, 6, 4], mountains: 4 }
}
