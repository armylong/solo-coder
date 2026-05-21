import { COLS, ROWS, SHAPES, COLORS, TETROMINO_TYPES } from './constants.js';

export class Tetromino {
    constructor(type) {
        this.type = type;
        this.shape = SHAPES[type];
        this.color = COLORS[type];
        this.rotation = 0;
        this.x = Math.floor(COLS / 2) - Math.floor(this.shape[0][0].length / 2);
        this.y = 0;
    }

    getCurrentShape() {
        return this.shape[this.rotation];
    }

    getRotatedShape() {
        const nextRotation = (this.rotation + 1) % 4;
        return this.shape[nextRotation];
    }

    rotate() {
        this.rotation = (this.rotation + 1) % 4;
    }

    rotateBack() {
        this.rotation = (this.rotation + 3) % 4;
    }

    moveLeft() {
        this.x--;
    }

    moveRight() {
        this.x++;
    }

    moveDown() {
        this.y++;
    }

    moveUp() {
        this.y--;
    }

    getPositions() {
        const shape = this.getCurrentShape();
        const positions = [];
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    positions.push({
                        x: this.x + col,
                        y: this.y + row
                    });
                }
            }
        }
        return positions;
    }

    clone() {
        const cloned = new Tetromino(this.type);
        cloned.rotation = this.rotation;
        cloned.x = this.x;
        cloned.y = this.y;
        return cloned;
    }
}

export class TetrominoFactory {
    constructor() {
        this.types = Object.keys(TETROMINO_TYPES);
        this.bag = [];
        this.fillBag();
    }

    fillBag() {
        this.bag = [...this.types];
        for (let i = this.bag.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
        }
    }

    getNextType() {
        if (this.bag.length === 0) {
            this.fillBag();
        }
        return this.bag.pop();
    }

    create() {
        const type = this.getNextType();
        return new Tetromino(type);
    }
}
