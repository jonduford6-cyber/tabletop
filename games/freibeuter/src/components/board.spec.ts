import { describe, expect, it } from 'vitest'
import { BOARD_DATA } from '../definition/boardData.js'
import { Board, board, checkBoardData, type BoardData } from './board.js'
import { allDutchmanCards, allSeaCards } from './cards.js'

function mutated(change: (data: BoardData) => void): BoardData {
    const copy = structuredClone(BOARD_DATA)
    change(copy)
    return copy
}

describe('Board data', () => {
    it('has 49 sea spaces in rows A to G and columns 1 to 7', () => {
        expect(board.spaces).toHaveLength(49)
        expect(board.spaces[0]).toBe('A1')
        expect(board.spaces[48]).toBe('G7')
    })

    it('has 24 outside and 25 inside spaces, as listed in the rulebook', () => {
        const outside = board.spaces.filter((space) => board.isOutside(space))
        expect(outside.sort()).toEqual(
            [
                'A1',
                'A2',
                'A3',
                'A4',
                'A5',
                'A6',
                'A7',
                'G1',
                'G2',
                'G3',
                'G4',
                'G5',
                'G6',
                'G7',
                'B1',
                'B7',
                'C1',
                'C7',
                'D1',
                'D7',
                'E1',
                'E7',
                'F1',
                'F7'
            ].sort()
        )
        expect(board.spaces.filter((space) => !board.isOutside(space))).toHaveLength(25)
    })

    it('has 36 intersections, each touching four spaces', () => {
        expect(board.intersections).toHaveLength(36)
        for (const intersection of board.intersections) {
            expect(new Set(intersection.spaces).size).toBe(4)
        }
        expect(board.intersection('AB12').spaces).toEqual(['A1', 'A2', 'B1', 'B2'])
        expect(board.intersection('FG67').spaces).toEqual(['F6', 'F7', 'G6', 'G7'])
    })

    it('lets 25 spaces touch 4 intersections, 20 touch 2 and 4 touch 1', () => {
        const counts = board.spaces.map((space) => board.intersectionsAround(space).length)
        expect(counts.filter((count) => count === 4)).toHaveLength(25)
        expect(counts.filter((count) => count === 2)).toHaveLength(20)
        expect(counts.filter((count) => count === 1)).toHaveLength(4)
    })

    it('has 74 sea cards: one per outside space and two per inside space', () => {
        const cards = allSeaCards()
        expect(cards).toHaveLength(74)
        for (const space of board.spaces) {
            expect(cards.filter((card) => card.target === space)).toHaveLength(
                board.isOutside(space) ? 1 : 2
            )
        }
    })

    it('has 14 Flying Dutchman cards: one for each row and each column', () => {
        const cards = allDutchmanCards()
        expect(cards).toHaveLength(14)
        expect(cards.filter((card) => card.target.startsWith('row:'))).toHaveLength(7)
        expect(cards.filter((card) => card.target.startsWith('col:'))).toHaveLength(7)
        expect(board.spacesOfLine('row:C')).toHaveLength(7)
        expect(board.spacesOfLine('col:3')).toEqual(['A3', 'B3', 'C3', 'D3', 'E3', 'F3', 'G3'])
    })

    it('passes its own consistency check', () => {
        expect(checkBoardData(BOARD_DATA)).toEqual([])
    })
})

describe('Board data checks at load', () => {
    const failsWith = (data: BoardData, message: string) => {
        expect(() => new Board(data)).toThrow('The board data is inconsistent')
        expect(checkBoardData(data).join('\n')).toContain(message)
    }

    it('fails when an intersection is missing', () => {
        failsWith(
            mutated((data) => data.intersections.pop()),
            'Expected 36 intersections but found 35'
        )
    })

    it('fails when an intersection names an unknown space', () => {
        failsWith(
            mutated((data) => {
                data.intersections[0].spaces[0] = 'H1'
            }),
            'unknown spaces H1'
        )
    })

    it('fails when an intersection is not a 2 by 2 block', () => {
        failsWith(
            mutated((data) => {
                data.intersections[0].spaces = ['A1', 'A2', 'B1', 'C1']
            }),
            'must touch a 2 by 2 block'
        )
    })

    it('fails when two intersections cover the same block', () => {
        failsWith(
            mutated((data) => {
                data.intersections[1] = { id: 'XX', spaces: [...data.intersections[0].spaces] }
            }),
            "repeats another intersection's block"
        )
    })

    it('fails when the outside spaces are wrong', () => {
        failsWith(
            mutated((data) => {
                data.outsideSpaces[0] = 'C3'
            }),
            'not the spaces that touch fewer than four intersections'
        )
    })

    it('fails when an inside space has only one sea card', () => {
        failsWith(
            mutated((data) => {
                data.seaCardCopies.C3 = 1
            }),
            'Space C3 has 1 sea cards, expected 2'
        )
    })

    it('fails when the sea cards do not add up to 74', () => {
        failsWith(
            mutated((data) => {
                data.seaCardCopies.A1 = 2
            }),
            'Expected 74 sea cards but the list has 75'
        )
    })

    it('fails when a Flying Dutchman card is missing', () => {
        failsWith(
            mutated((data) => data.dutchmanCards.pop()),
            'Expected 14 Flying Dutchman cards but found 13'
        )
    })

    it('fails when a Flying Dutchman card is repeated instead of a column', () => {
        failsWith(
            mutated((data) => {
                data.dutchmanCards[13] = 'row:A'
            }),
            'one for each row and one for each column'
        )
    })
})
