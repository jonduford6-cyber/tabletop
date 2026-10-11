type Standing = { playerId: string; points: number; dolmensPlaced: number }

export function winnersOf(state: { players: Standing[] }): string[] {
    const bestPoints = Math.max(...state.players.map((player) => player.points))
    const leaders = state.players.filter((player) => player.points === bestPoints)
    const mostBuilt = Math.max(...leaders.map((player) => player.dolmensPlaced))
    return leaders
        .filter((player) => player.dolmensPlaced === mostBuilt)
        .map((player) => player.playerId)
}
