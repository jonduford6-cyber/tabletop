import { describe, expect, it } from 'vitest'
import { suppliedSquareKeys } from './supply.js'
import { EdgeOrientation } from './geometry.js'

const single = (orientation: EdgeOrientation, row: number, col: number) => ({
    orientation,
    row,
    col,
    count: 1
})
const double = (orientation: EdgeOrientation, row: number, col: number) => ({
    orientation,
    row,
    col,
    count: 2
})

describe('Water supply', () => {
    it('supplies one square on each side of a single vertical canal', () => {
        const supplied = suppliedSquareKeys([single(EdgeOrientation.Vertical, 2, 5)])
        expect([...supplied].sort()).toEqual(['3,5', '3,6'])
    })

    it('supplies one square on each side of a single horizontal canal', () => {
        const supplied = suppliedSquareKeys([single(EdgeOrientation.Horizontal, 2, 5)])
        expect([...supplied].sort()).toEqual(['2,6', '3,6'])
    })

    it('supplies two squares on each side of a double vertical canal', () => {
        const supplied = suppliedSquareKeys([double(EdgeOrientation.Vertical, 2, 5)])
        expect([...supplied].sort()).toEqual(['3,4', '3,5', '3,6', '3,7'])
    })

    it('supplies two squares on each side of a double horizontal canal', () => {
        const supplied = suppliedSquareKeys([double(EdgeOrientation.Horizontal, 2, 5)])
        expect([...supplied].sort()).toEqual(['1,6', '2,6', '3,6', '4,6'])
    })

    it('does not supply squares along the length of the canal', () => {
        const supplied = suppliedSquareKeys([single(EdgeOrientation.Vertical, 2, 5)])
        expect(supplied.has('2,5')).toBe(false)
        expect(supplied.has('4,5')).toBe(false)
        expect(supplied.has('4,6')).toBe(false)
    })

    it('supplies only the inner square of a canal on the board border', () => {
        const supplied = suppliedSquareKeys([single(EdgeOrientation.Horizontal, 0, 3)])
        expect([...supplied]).toEqual(['1,4'])
    })

    it('reaches only the inner two squares of a double canal on the border', () => {
        const supplied = suppliedSquareKeys([double(EdgeOrientation.Horizontal, 0, 3)])
        expect([...supplied].sort()).toEqual(['1,4', '2,4'])
    })

    it('supplies across region borders', () => {
        const supplied = suppliedSquareKeys([double(EdgeOrientation.Vertical, 2, 5)])
        expect(supplied.has('3,4')).toBe(true)
        expect(supplied.has('3,7')).toBe(true)
    })

    it('supplies nothing without canals', () => {
        expect(suppliedSquareKeys([]).size).toBe(0)
    })
})
