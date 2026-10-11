import { createAction } from '@tabletop/common'
import { describe, expect, it } from 'vitest'
import { DrawCard } from './drawCard.js'
import { CardType } from '../components/cards.js'
import { ActionType } from '../definition/actions.js'
import { MachineState } from '../definition/states.js'
import { EndReason, Pile } from '../model/gameState.js'
import {
    activePlayerId,
    draw,
    execute,
    hydrate,
    playSea,
    scenario,
    validActionTypes
} from '../util/testHelper.js'

const afterPlaying = (extra: Parameters<typeof scenario>[0] = {}) =>
    playSea(
        scenario({
            numPlayers: 3,
            hands: { p1: ['A1', 'B3', 'C3', 'D3', 'row:C'] },
            seaPile: ['E3', 'E4', 'E5'],
            dutchmanPile: ['col:1', 'col:2'],
            ...extra
        }),
        'A1'
    )

describe('The card draw after an action', () => {
    it('offers only the draw to the player who just acted', () => {
        const test = afterPlaying()
        expect(validActionTypes(test, 'p1')).toEqual([ActionType.DrawCard])
        expect(validActionTypes(test, 'p2')).toEqual([])
    })

    it('lets the player draw from the sea pile', () => {
        const done = draw(afterPlaying(), Pile.Sea)
        const player = done.state.players[0]
        expect(player.seaCount).toBe(4)
        expect(player.dutchmanCount).toBe(1)
        expect(player.hand.at(-1)?.type).toBe(CardType.Sea)
        expect(done.state.seaPile.remaining).toBe(2)
        expect(done.state.dutchmanPile.remaining).toBe(2)
    })

    it('lets the player draw from the Flying Dutchman pile instead', () => {
        const done = draw(afterPlaying(), Pile.Dutchman)
        const player = done.state.players[0]
        expect(player.seaCount).toBe(3)
        expect(player.dutchmanCount).toBe(2)
        expect(done.state.dutchmanPile.remaining).toBe(1)
        expect(done.state.seaPile.remaining).toBe(3)
    })

    it('ends the turn and passes it clockwise', () => {
        const done = draw(afterPlaying(), Pile.Sea)
        expect(done.state.machineState).toBe(MachineState.StartOfTurn)
        expect(activePlayerId(done.state)).toBe('p2')
    })

    it('keeps the hand at 5 cards after every played card and draw', () => {
        const done = draw(afterPlaying(), Pile.Dutchman)
        expect(done.state.players[0].hand).toHaveLength(5)
    })

    it('must draw a sea card after playing the last sea card (U15)', () => {
        const test = playSea(
            scenario({
                hands: { p1: ['A1', 'row:C', 'row:D'] },
                seaPile: ['E3'],
                dutchmanPile: ['col:1']
            }),
            'A1'
        )
        expect(hydrate(test).drawChoices('p1')).toEqual([Pile.Sea])
        expect(() => draw(test, Pile.Dutchman)).toThrow('may not draw from that pile')
        expect(draw(test, Pile.Sea).state.players[0].seaCount).toBe(1)
    })

    it('may draw either pile when a sea card is still in the hand (U15)', () => {
        expect(hydrate(afterPlaying()).drawChoices('p1')).toEqual([Pile.Sea, Pile.Dutchman])
    })

    it('must draw a sea card once all Flying Dutchman cards are drawn', () => {
        const test = afterPlaying({ dutchmanPile: [] })
        expect(hydrate(test).drawChoices('p1')).toEqual([Pile.Sea])
        expect(() => draw(test, Pile.Dutchman)).toThrow()
    })

    it('must draw a Flying Dutchman card when no sea cards are left', () => {
        const test = afterPlaying({ seaPile: [] })
        expect(hydrate(test).drawChoices('p1')).toEqual([Pile.Dutchman])
        const done = draw(test, Pile.Dutchman)
        expect(done.state.players[0].dutchmanCount).toBe(2)
    })

    it('ends the game when a draw is required and both piles are empty (U8)', () => {
        const done = afterPlaying({ seaPile: [], dutchmanPile: [] })
        expect(done.state.machineState).toBe(MachineState.EndOfGame)
        expect(done.state.endReason).toBe(EndReason.DrawPilesEmpty)
        expect(done.state.players[0].hand).toHaveLength(4)
    })

    it('does not reshuffle the discard piles', () => {
        const done = afterPlaying({ seaPile: [], dutchmanPile: [] })
        expect(done.state.seaDiscard).toHaveLength(1)
        expect(done.state.seaPile.remaining).toBe(0)
    })

    it('marks every draw as revealing information, so undo cannot go back past it', () => {
        const done = draw(afterPlaying(), Pile.Sea)
        const drawn = done.processed.find((action) => action.type === ActionType.DrawCard)
        expect(drawn?.revealsInfo).toBe(true)
        expect(Reflect.get(drawn ?? {}, 'card')).toEqual({ type: CardType.Sea, target: 'E5' })
    })

    it('rejects a draw by a player whose turn it is not', () => {
        const test = afterPlaying()
        const action = createAction(DrawCard, {
            gameId: test.state.gameId,
            playerId: 'p2',
            pile: Pile.Sea
        })
        expect(() => execute(test, action)).toThrow('not an active player')
    })
})
