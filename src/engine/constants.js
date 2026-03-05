/*
 * constants.js - Board layout and game variants
 *
 * The Morabaraba board has 24 positions (nodes) arranged in 3 squares
 * connected by lines. Here's how the numbering works:
 *
 * 0-----------1-----------2
 * |           |           |
 * |   3-------4-------5   |
 * |   |       |       |   |
 * |   |   6---7---8   |   |
 * |   |   |       |   |   |
 * 9---10--11      12--13--14
 * |   |   |       |   |   |
 * |   |   15--16--17  |   |
 * |   |       |       |   |
 * |   18------19-----20   |
 * |           |           |
 * 21---------22----------23
 */

// Which nodes are next to each other (adjacency map)
// Used string keys so it plays nice with JSON
const STANDARD_ADJACENCY = {
  "0": [1, 3, 9],
  "1": [0, 2, 4],
  "2": [1, 5, 14],
  "3": [0, 4, 6, 10],
  "4": [1, 3, 5, 7],
  "5": [2, 4, 8, 13],
  "6": [3, 7, 11],
  "7": [4, 6, 8],
  "8": [5, 7, 12],
  "9": [0, 10, 21],
  "10": [3, 9, 11, 18],
  "11": [6, 10, 15],
  "12": [8, 13, 17],
  "13": [5, 12, 14, 20],
  "14": [2, 13, 23],
  "15": [11, 16, 18],
  "16": [15, 17, 19],
  "17": [12, 16, 20],
  "18": [10, 15, 19, 21],
  "19": [16, 18, 20, 22],
  "20": [13, 17, 19, 23],
  "21": [9, 18, 22],
  "22": [19, 21, 23],
  "23": [14, 20, 22]
};


// All the possible mills (3 in a row)
// Each sub-array is a group of 3 node IDs that form a line on the board
const STANDARD_MILLS = [
  // outer square sides
  [0, 1, 2],
  [0, 9, 21],
  [2, 14, 23],
  [21, 22, 23],
  // middle square sides
  [3, 4, 5],
  [3, 10, 18],
  [5, 13, 20],
  [18, 19, 20],
  // inner square sides
  [6, 7, 8],
  [6, 11, 15],
  [8, 12, 17],
  [15, 16, 17],
  // the lines connecting the squares vertically/horizontally
  [1, 4, 7],
  [9, 10, 11],
  [12, 13, 14],
  [16, 19, 22],
  // diagonal lines (corner to corner through the squares)
  [0, 3, 6],
  [2, 5, 8],
  [21, 18, 15],
  [23, 20, 17]
];

// The three game variants - same board, just different number of starting cows
const VARIANTS = {
  '12-cow': {
    name: '12-cow',
    startingCows: 12,
    adjacency: STANDARD_ADJACENCY,
    mills: STANDARD_MILLS
  },
  '9-cow': {
    name: '9-cow',
    startingCows: 9,
    adjacency: STANDARD_ADJACENCY,
    mills: STANDARD_MILLS
  },
  '6-cow': {
    name: '6-cow',
    startingCows: 6,
    adjacency: STANDARD_ADJACENCY,
    mills: STANDARD_MILLS
  }
};

const BOARD_SIZE = 24;
const MIN_NODE_ID = 0;
const MAX_NODE_ID = 23;

module.exports = {
  STANDARD_ADJACENCY,
  STANDARD_MILLS,
  VARIANTS,
  BOARD_SIZE,
  MIN_NODE_ID,
  MAX_NODE_ID
};
