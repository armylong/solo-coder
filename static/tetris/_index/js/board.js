import { COLS, ROWS, BLOCK_SIZE, COLORS } from './constants.js';

export class Board {
    constructor() {
        this.grid = [];
        this.reset();
    }

    reset() {
        this.grid = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
    }

    isValidPosition(x, y) {
        return x >= 0 && x < COLS && y >= 0 && y < ROWS && !this.grid[y][x];
    }

    canPlace(tetromino) {
        const positions = tetromino.getPositions();
        for (const pos of positions) {
            if (!this.isValidPosition(pos.x, pos.y)) {
                return false;
            }
        }
        return true;
    }

    place(tetromino) {
        const positions = tetromino.getPositions();
        for (const pos of positions) {
            if (pos.y >= 0 && pos.y < ROWS && pos.x >= 0 && pos.x < COLS) {
                this.grid[pos.y][pos.x] = tetromino.color;
            }
        }
    }

    clearLines() {
        let linesCleared = 0;
        let y = ROWS - 1;

        while (y >= 0) {
            if (this.grid[y].every(cell => cell !== null)) {
                this.grid.splice(y, 1);
                this.grid.unshift(Array(COLS).fill(null));
                linesCleared++;
            } else {
                y--;
            }
        }

        return linesCleared;
    }

    isGameOver() {
        for (let x = 0; x < COLS; x++) {
            if (this.grid[0][x] !== null) {
                return true;
            }
        }
        return false;
    }

    getGhostPosition(tetromino) {
        const ghost = tetromino.clone();
        while (this.canPlace(ghost)) {
            ghost.moveDown();
        }
        ghost.moveUp();
        return ghost;
    }

    getGrid() {
        return this.grid;
    }
}
