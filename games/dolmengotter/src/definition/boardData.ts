import type { BoardData } from '../components/board.js'

// The whole board lives in this one file. Places are [row, col]; each circle lists its stone
// places in order around the circle. Edit here to correct the board; it is checked at load.
export const BOARD_DATA: BoardData = {
    stonePlaceColumnsByRow: {
        0: [3, 5, 6, 9, 11, 12],
        1: [1, 2, 4, 7, 8, 10, 13, 14],
        2: [1, 2, 4, 7, 8, 10, 13, 14],
        3: [0, 3, 5, 6, 9, 11, 12, 15],
        4: [0, 3, 5, 6, 9, 11, 12, 15],
        5: [1, 2, 4, 7, 8, 10, 13, 14],
        6: [1, 2, 4, 7, 8, 10, 13, 14],
        7: [0, 3, 5, 6, 9, 11, 12, 15],
        8: [0, 3, 5, 6, 9, 11, 12, 15],
        9: [1, 2, 4, 7, 8, 10, 13, 14]
    },
    circles: [
        {
            shape: 'tetragonal',
            printedFactor: 3,
            stonePlaces: [
                [1, 1],
                [1, 2],
                [2, 2],
                [2, 1]
            ]
        },
        {
            shape: 'tetragonal',
            printedFactor: 3,
            stonePlaces: [
                [1, 7],
                [1, 8],
                [2, 8],
                [2, 7]
            ]
        },
        {
            shape: 'tetragonal',
            printedFactor: 3,
            stonePlaces: [
                [1, 13],
                [1, 14],
                [2, 14],
                [2, 13]
            ]
        },
        {
            shape: 'tetragonal',
            printedFactor: 3,
            stonePlaces: [
                [3, 5],
                [3, 6],
                [4, 6],
                [4, 5]
            ]
        },
        {
            shape: 'tetragonal',
            printedFactor: 3,
            stonePlaces: [
                [3, 11],
                [3, 12],
                [4, 12],
                [4, 11]
            ]
        },
        {
            shape: 'tetragonal',
            printedFactor: 3,
            stonePlaces: [
                [5, 1],
                [5, 2],
                [6, 2],
                [6, 1]
            ]
        },
        {
            shape: 'tetragonal',
            printedFactor: 3,
            stonePlaces: [
                [5, 7],
                [5, 8],
                [6, 8],
                [6, 7]
            ]
        },
        {
            shape: 'tetragonal',
            printedFactor: 3,
            stonePlaces: [
                [5, 13],
                [5, 14],
                [6, 14],
                [6, 13]
            ]
        },
        {
            shape: 'tetragonal',
            printedFactor: 3,
            stonePlaces: [
                [7, 5],
                [7, 6],
                [8, 6],
                [8, 5]
            ]
        },
        {
            shape: 'tetragonal',
            printedFactor: 3,
            stonePlaces: [
                [7, 11],
                [7, 12],
                [8, 12],
                [8, 11]
            ]
        },
        {
            shape: 'hexagonal',
            printedFactor: 4,
            stonePlaces: [
                [0, 3],
                [1, 4],
                [2, 4],
                [3, 3],
                [2, 2],
                [1, 2]
            ]
        },
        {
            shape: 'hexagonal',
            printedFactor: 4,
            stonePlaces: [
                [0, 9],
                [1, 10],
                [2, 10],
                [3, 9],
                [2, 8],
                [1, 8]
            ]
        },
        {
            shape: 'hexagonal',
            printedFactor: 4,
            stonePlaces: [
                [2, 4],
                [3, 5],
                [4, 5],
                [5, 4],
                [4, 3],
                [3, 3]
            ]
        },
        {
            shape: 'hexagonal',
            printedFactor: 4,
            stonePlaces: [
                [2, 10],
                [3, 11],
                [4, 11],
                [5, 10],
                [4, 9],
                [3, 9]
            ]
        },
        {
            shape: 'hexagonal',
            printedFactor: 4,
            stonePlaces: [
                [4, 3],
                [5, 4],
                [6, 4],
                [7, 3],
                [6, 2],
                [5, 2]
            ]
        },
        {
            shape: 'hexagonal',
            printedFactor: 4,
            stonePlaces: [
                [4, 9],
                [5, 10],
                [6, 10],
                [7, 9],
                [6, 8],
                [5, 8]
            ]
        },
        {
            shape: 'hexagonal',
            printedFactor: 4,
            stonePlaces: [
                [6, 4],
                [7, 5],
                [8, 5],
                [9, 4],
                [8, 3],
                [7, 3]
            ]
        },
        {
            shape: 'hexagonal',
            printedFactor: 4,
            stonePlaces: [
                [6, 10],
                [7, 11],
                [8, 11],
                [9, 10],
                [8, 9],
                [7, 9]
            ]
        },
        {
            shape: 'octagonal',
            printedFactor: 5,
            stonePlaces: [
                [0, 5],
                [0, 6],
                [1, 7],
                [2, 7],
                [3, 6],
                [3, 5],
                [2, 4],
                [1, 4]
            ]
        },
        {
            shape: 'octagonal',
            printedFactor: 5,
            stonePlaces: [
                [0, 11],
                [0, 12],
                [1, 13],
                [2, 13],
                [3, 12],
                [3, 11],
                [2, 10],
                [1, 10]
            ]
        },
        {
            shape: 'octagonal',
            printedFactor: 5,
            stonePlaces: [
                [2, 1],
                [2, 2],
                [3, 3],
                [4, 3],
                [5, 2],
                [5, 1],
                [4, 0],
                [3, 0]
            ]
        },
        {
            shape: 'octagonal',
            printedFactor: 5,
            stonePlaces: [
                [2, 7],
                [2, 8],
                [3, 9],
                [4, 9],
                [5, 8],
                [5, 7],
                [4, 6],
                [3, 6]
            ]
        },
        {
            shape: 'octagonal',
            printedFactor: 5,
            stonePlaces: [
                [2, 13],
                [2, 14],
                [3, 15],
                [4, 15],
                [5, 14],
                [5, 13],
                [4, 12],
                [3, 12]
            ]
        },
        {
            shape: 'octagonal',
            printedFactor: 5,
            stonePlaces: [
                [4, 5],
                [4, 6],
                [5, 7],
                [6, 7],
                [7, 6],
                [7, 5],
                [6, 4],
                [5, 4]
            ]
        },
        {
            shape: 'octagonal',
            printedFactor: 5,
            stonePlaces: [
                [4, 11],
                [4, 12],
                [5, 13],
                [6, 13],
                [7, 12],
                [7, 11],
                [6, 10],
                [5, 10]
            ]
        },
        {
            shape: 'octagonal',
            printedFactor: 5,
            stonePlaces: [
                [6, 1],
                [6, 2],
                [7, 3],
                [8, 3],
                [9, 2],
                [9, 1],
                [8, 0],
                [7, 0]
            ]
        },
        {
            shape: 'octagonal',
            printedFactor: 5,
            stonePlaces: [
                [6, 7],
                [6, 8],
                [7, 9],
                [8, 9],
                [9, 8],
                [9, 7],
                [8, 6],
                [7, 6]
            ]
        },
        {
            shape: 'octagonal',
            printedFactor: 5,
            stonePlaces: [
                [6, 13],
                [6, 14],
                [7, 15],
                [8, 15],
                [9, 14],
                [9, 13],
                [8, 12],
                [7, 12]
            ]
        }
    ],
    borderLinks: [
        [
            [0, 3],
            [8, 3]
        ],
        [
            [0, 5],
            [8, 5]
        ],
        [
            [0, 6],
            [8, 6]
        ],
        [
            [0, 9],
            [8, 9]
        ],
        [
            [0, 11],
            [8, 11]
        ],
        [
            [0, 12],
            [8, 12]
        ],
        [
            [1, 2],
            [9, 2]
        ],
        [
            [1, 4],
            [9, 4]
        ],
        [
            [1, 7],
            [9, 7]
        ],
        [
            [1, 8],
            [9, 8]
        ],
        [
            [1, 10],
            [9, 10]
        ],
        [
            [1, 13],
            [9, 13]
        ],
        [
            [2, 1],
            [2, 14]
        ],
        [
            [3, 0],
            [3, 15]
        ],
        [
            [4, 0],
            [4, 15]
        ],
        [
            [5, 1],
            [5, 14]
        ],
        [
            [6, 1],
            [6, 14]
        ],
        [
            [7, 0],
            [7, 15]
        ],
        [
            [8, 0],
            [8, 15]
        ]
    ],
    cornerLinks: [
        [
            [1, 1],
            [1, 14]
        ],
        [
            [1, 1],
            [9, 1]
        ],
        [
            [1, 1],
            [9, 14]
        ],
        [
            [1, 14],
            [9, 1]
        ],
        [
            [1, 14],
            [9, 14]
        ],
        [
            [9, 1],
            [9, 14]
        ]
    ],
    scoringTrack: { first: 1, last: 100, startField: 4 }
}
