import { suppliedSquareKeys } from '../components/supply.js'
import { squareKey } from '../components/geometry.js'
import type { AquaduktGameState } from '../model/gameState.js'

export type PlayerTally = {
    playerId: string
    houses: number
    tiles: number
}

export function tallyPlayers(state: AquaduktGameState): PlayerTally[] {
    const supplied = suppliedSquareKeys(state.canals)
    return state.players.map((player) => {
        const suppliedTiles = state.houses.filter(
            (house) => house.playerId === player.playerId && supplied.has(squareKey(house))
        )
        return {
            playerId: player.playerId,
            houses: suppliedTiles.reduce((total, house) => total + house.value, 0),
            tiles: suppliedTiles.length
        }
    })
}

export function leadingPlayerIds(tallies: readonly PlayerTally[]): string[] {
    const mostHouses = Math.max(...tallies.map((tally) => tally.houses))
    const byHouses = tallies.filter((tally) => tally.houses === mostHouses)
    const mostTiles = Math.max(...byHouses.map((tally) => tally.tiles))
    return byHouses.filter((tally) => tally.tiles === mostTiles).map((tally) => tally.playerId)
}
