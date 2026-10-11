export const CIRCLE_COUNT = 28
export const DRUIDS_PER_PLAYER = 3

export const DOLMEN_VALUES = [4, 3, 2, 1] as const

type PlayerCountSetup = {
    stones: number
    dolmensByValue: Record<(typeof DOLMEN_VALUES)[number], number>
}

export const SETUP_BY_PLAYER_COUNT: Record<number, PlayerCountSetup> = {
    2: { stones: 16, dolmensByValue: { 4: 1, 3: 3, 2: 4, 1: 5 } },
    3: { stones: 13, dolmensByValue: { 4: 1, 3: 2, 2: 3, 1: 4 } },
    4: { stones: 12, dolmensByValue: { 4: 1, 3: 1, 2: 3, 1: 4 } },
    5: { stones: 10, dolmensByValue: { 4: 1, 3: 1, 2: 2, 1: 3 } }
}

export function dolmenValuesFor(numPlayers: number): number[] {
    const setup = SETUP_BY_PLAYER_COUNT[numPlayers]
    if (!setup) throw Error(`Die Dolmengötter cannot be played with ${numPlayers} players`)
    return DOLMEN_VALUES.flatMap((value) => Array<number>(setup.dolmensByValue[value]).fill(value))
}

export type CircleShape = 'tetragonal' | 'hexagonal' | 'octagonal'

export const CIRCLE_SIZE: Record<CircleShape, number> = {
    tetragonal: 4,
    hexagonal: 6,
    octagonal: 8
}

export const FACTORS_TOP_DOWN: Record<CircleShape, readonly number[]> = {
    tetragonal: [3, 2],
    hexagonal: [4, 3, 2, 1],
    octagonal: [5, 4, 3, 2, 1, 0]
}

export const MAX_BATCH_HEIGHT: Record<CircleShape, number> = {
    tetragonal: 2,
    hexagonal: 4,
    octagonal: 6
}

export const MIN_PLACES_FOR_FIVE_PLAYERS = 65
