import { board } from '@tabletop/freibeuter'
import { describe, expect, it } from 'vitest'
import {
    CELL,
    MARGIN_TOP,
    MARGIN_X,
    boatOffsets,
    columnIndex,
    intersectionPoint,
    rowIndex,
    shipLabel,
    spaceCenter,
    spaceOrigin
} from './boardGeometry.js'

describe('Board geometry', () => {
    it('lays the 49 spaces out as 7 rows A to G and 7 columns 1 to 7', () => {
        expect(rowIndex('A1')).toBe(0)
        expect(rowIndex('G7')).toBe(6)
        expect(columnIndex('A1')).toBe(0)
        expect(columnIndex('G7')).toBe(6)
        expect(spaceOrigin('A1')).toEqual({ x: MARGIN_X, y: MARGIN_TOP })
        expect(spaceCenter('B2')).toEqual({ x: MARGIN_X + CELL * 1.5, y: MARGIN_TOP + CELL * 1.5 })
    })

    it('puts every intersection exactly on the corner shared by its four spaces', () => {
        for (const intersection of board.intersections) {
            const point = intersectionPoint(intersection.id)
            expect(point.x % CELL).toBeCloseTo(MARGIN_X % CELL)
            expect((point.y - MARGIN_TOP) % CELL).toBeCloseTo(0)
            for (const space of intersection.spaces) {
                const center = spaceCenter(space)
                expect(Math.hypot(center.x - point.x, center.y - point.y)).toBeCloseTo(
                    (CELL * Math.SQRT2) / 2
                )
            }
        }
    })

    it('gives the 36 intersections 36 different points', () => {
        const points = new Set(
            board.intersections.map((intersection) => {
                const point = intersectionPoint(intersection.id)
                return `${point.x},${point.y}`
            })
        )
        expect(points.size).toBe(36)
    })

    it('places two boats side by side in a space, and one boat in the middle', () => {
        expect(boatOffsets(1)).toHaveLength(1)
        const two = boatOffsets(2)
        expect(two[0].x).toBeLessThan(0)
        expect(two[1].x).toBeGreaterThan(0)
        expect(two[0].y).toBe(two[1].y)
        expect(boatOffsets(4)).toHaveLength(4)
    })

    it('writes a ship as end value over payment', () => {
        expect(shipLabel(5)).toBe('5/1')
        expect(shipLabel(10)).toBe('10/2')
        expect(shipLabel(15)).toBe('15/3')
        expect(shipLabel(20)).toBe('20/4')
    })
})
