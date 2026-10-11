import { Color } from '@tabletop/common'

export type PieceColors = { fill: string; text: string; bgClass: string; textClass: string }

export const PIECE_COLORS: Partial<Record<Color, PieceColors>> = {
    [Color.White]: {
        fill: '#f1f5f9',
        text: '#111827',
        bgClass: 'bg-[#f1f5f9]',
        textClass: 'text-[#f1f5f9]'
    },
    [Color.Blue]: {
        fill: '#1d4ed8',
        text: '#ffffff',
        bgClass: 'bg-[#1d4ed8]',
        textClass: 'text-[#1d4ed8]'
    },
    [Color.Red]: {
        fill: '#b91c1c',
        text: '#ffffff',
        bgClass: 'bg-[#b91c1c]',
        textClass: 'text-[#b91c1c]'
    },
    [Color.Orange]: {
        fill: '#f59e0b',
        text: '#111827',
        bgClass: 'bg-[#f59e0b]',
        textClass: 'text-[#f59e0b]'
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
