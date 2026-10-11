import { Color } from '@tabletop/common'

export type PieceColors = { fill: string; text: string; bgClass: string; textClass: string }

export const PIECE_COLORS: Partial<Record<Color, PieceColors>> = {
    [Color.Red]: {
        fill: '#c0392b',
        text: '#ffffff',
        bgClass: 'bg-[#c0392b]',
        textClass: 'text-[#c0392b]'
    },
    [Color.Yellow]: {
        fill: '#f4d03f',
        text: '#111827',
        bgClass: 'bg-[#f4d03f]',
        textClass: 'text-[#f4d03f]'
    },
    [Color.Blue]: {
        fill: '#2563eb',
        text: '#ffffff',
        bgClass: 'bg-[#2563eb]',
        textClass: 'text-[#2563eb]'
    },
    [Color.Green]: {
        fill: '#16a34a',
        text: '#ffffff',
        bgClass: 'bg-[#16a34a]',
        textClass: 'text-[#16a34a]'
    },
    [Color.Purple]: {
        fill: '#7e22ce',
        text: '#ffffff',
        bgClass: 'bg-[#7e22ce]',
        textClass: 'text-[#7e22ce]'
    }
}

export const FALLBACK_PIECE_COLORS: PieceColors = {
    fill: '#555555',
    text: '#ffffff',
    bgClass: 'bg-[#555555]',
    textClass: 'text-[#555555]'
}

export function pieceColorsFor(color?: Color): PieceColors {
    return (color && PIECE_COLORS[color]) || FALLBACK_PIECE_COLORS
}
