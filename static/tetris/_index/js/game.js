import { GAME_STATE, SCORE_TABLE, LEVEL_SPEED, LINES_PER_LEVEL, STORAGE_KEY, BLOCK_SIZE, NEXT_BLOCK_SIZE, TETROMINO_TYPES } from './constants.js';
import { TetrominoFactory, Tetromino } from './tetromino.js';
import { Board } from './board.js';

export const T_SPIN_SCORE = {
    0: 0,
    1: 800,
    2: 1200,
    3: 1600
};

export class Game {
    constructor() {
        this.board = new Board();
        this.factory = new TetrominoFactory();
        this.currentPiece = null;
        this.nextPiece = null;
        this.holdPiece = null;
        this.canHold = true;
        this.state = GAME_STATE.READY;
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.highScore = this.loadHighScore();
        this.dropInterval = LEVEL_SPEED[1];
        this.lastDropTime = 0;
        this.lastUpdateTime = 0;
        this.isSoftDropping = false;
        this.combo = 0;
        this.maxCombo = 0;
        this.lastRotation = false;
        this.showTSpin = false;
        this.tSpinTimer = 0;
    }

    start() {
        this.board.reset();
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.dropInterval = LEVEL_SPEED[1];
        this.holdPiece = null;
        this.canHold = true;
        this.combo = 0;
        this.maxCombo = 0;
        this.lastRotation = false;
        this.showTSpin = false;
        this.tSpinTimer = 0;
        this.state = GAME_STATE.PLAYING;
        this.spawnPiece();
        this.lastDropTime = performance.now();
        this.lastUpdateTime = performance.now();
    }

    togglePause() {
        if (this.state === GAME_STATE.PLAYING) {
            this.state = GAME_STATE.PAUSED;
        } else if (this.state === GAME_STATE.PAUSED) {
            this.state = GAME_STATE.PLAYING;
            this.lastDropTime = performance.now();
            this.lastUpdateTime = performance.now();
        }
    }

    restart() {
        this.start();
    }

    spawnPiece() {
        if (this.nextPiece === null) {
            this.nextPiece = this.factory.create();
        }
        this.currentPiece = this.nextPiece;
        this.nextPiece = this.factory.create();
        this.canHold = true;
        this.lastRotation = false;

        if (!this.board.canPlace(this.currentPiece)) {
            this.gameOver();
        }
    }

    hold() {
        if (!this.canHold || !this.currentPiece || this.state !== GAME_STATE.PLAYING) return false;

        const typeToHold = this.currentPiece.type;
        
        if (this.holdPiece === null) {
            this.holdPiece = new Tetromino(typeToHold);
            this.spawnPiece();
        } else {
            const tempType = this.holdPiece.type;
            this.holdPiece = new Tetromino(typeToHold);
            this.currentPiece = new Tetromino(tempType);
        }

        this.canHold = false;
        return true;
    }

    gameOver() {
        this.state = GAME_STATE.GAME_OVER;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore();
        }
    }

    update(timestamp) {
        if (this.state !== GAME_STATE.PLAYING) {
            return;
        }

        const deltaTime = timestamp - this.lastUpdateTime;
        this.lastUpdateTime = timestamp;

        const interval = this.isSoftDropping ? 50 : this.dropInterval;

        if (timestamp - this.lastDropTime > interval) {
            this.drop();
            this.lastDropTime = timestamp;
        }

        if (this.tSpinTimer > 0) {
            this.tSpinTimer -= deltaTime;
            if (this.tSpinTimer <= 0) {
                this.showTSpin = false;
                this.tSpinTimer = 0;
            }
        }
    }

    drop() {
        if (!this.currentPiece) return;

        this.currentPiece.moveDown();

        if (!this.board.canPlace(this.currentPiece)) {
            this.currentPiece.moveUp();
            this.lockPiece();
        }
    }

    hardDrop() {
        if (!this.currentPiece || this.state !== GAME_STATE.PLAYING) return;

        while (this.board.canPlace(this.currentPiece)) {
            this.currentPiece.moveDown();
        }
        this.currentPiece.moveUp();
        this.lockPiece();
    }

    detectTSpin(piece) {
        if (piece.type !== TETROMINO_TYPES.T) return false;

        const corners = [
            { x: piece.x, y: piece.y },
            { x: piece.x + 2, y: piece.y },
            { x: piece.x, y: piece.y + 2 },
            { x: piece.x + 2, y: piece.y + 2 }
        ];

        let filledCorners = 0;
        for (const corner of corners) {
            if (corner.x < 0 || corner.x >= 10 || corner.y < 0 || corner.y >= 20 ||
                this.board.grid[corner.y][corner.x] !== null) {
                filledCorners++;
            }
        }

        return filledCorners >= 3 && this.lastRotation;
    }

    lockPiece() {
        const isTSpin = this.detectTSpin(this.currentPiece);
        this.board.place(this.currentPiece);

        const linesCleared = this.board.clearLines();
        if (linesCleared > 0) {
            this.combo++;
            if (this.combo > this.maxCombo) {
                this.maxCombo = this.combo;
            }

            let lineScore = SCORE_TABLE[linesCleared] * this.level;
            
            if (isTSpin && linesCleared <= 3) {
                lineScore = T_SPIN_SCORE[linesCleared] * this.level;
                this.showTSpin = true;
                this.tSpinTimer = 1500;
            }

            const comboBonus = 50 * this.combo * this.level;
            this.score += lineScore + comboBonus;

            this.lines += linesCleared;
            this.updateLevel();
        } else {
            this.combo = 0;
        }

        if (this.board.isGameOver()) {
            this.gameOver();
        } else {
            this.spawnPiece();
        }
    }

    updateLevel() {
        const newLevel = Math.floor(this.lines / LINES_PER_LEVEL) + 1;
        if (newLevel > this.level) {
            this.level = Math.min(newLevel, 10);
            this.dropInterval = LEVEL_SPEED[this.level];
        }
    }

    rotate() {
        if (this.state !== GAME_STATE.PLAYING || !this.currentPiece) return;

        const originalX = this.currentPiece.x;
        this.currentPiece.rotate();

        const kicks = [0, -1, 1, -2, 2];
        for (const kick of kicks) {
            this.currentPiece.x = originalX + kick;
            if (this.board.canPlace(this.currentPiece)) {
                this.lastRotation = true;
                return;
            }
        }

        this.currentPiece.rotateBack();
        this.currentPiece.x = originalX;
        this.lastRotation = false;
    }

    moveLeft() {
        if (this.state !== GAME_STATE.PLAYING || !this.currentPiece) return;

        this.currentPiece.moveLeft();
        if (!this.board.canPlace(this.currentPiece)) {
            this.currentPiece.moveRight();
        } else {
            this.lastRotation = false;
        }
    }

    moveRight() {
        if (this.state !== GAME_STATE.PLAYING || !this.currentPiece) return;

        this.currentPiece.moveRight();
        if (!this.board.canPlace(this.currentPiece)) {
            this.currentPiece.moveLeft();
        } else {
            this.lastRotation = false;
        }
    }

    setSoftDropping(isSoftDropping) {
        this.isSoftDropping = isSoftDropping;
    }

    loadHighScore() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? parseInt(saved, 10) : 0;
        } catch (e) {
            return 0;
        }
    }

    saveHighScore() {
        try {
            localStorage.setItem(STORAGE_KEY, this.highScore.toString());
        } catch (e) {
            console.warn('无法保存最高分');
        }
    }

    getState() {
        return {
            board: this.board,
            currentPiece: this.currentPiece,
            nextPiece: this.nextPiece,
            holdPiece: this.holdPiece,
            score: this.score,
            lines: this.lines,
            level: this.level,
            highScore: this.highScore,
            gameState: this.state,
            combo: this.combo,
            maxCombo: this.maxCombo,
            showTSpin: this.showTSpin,
            tSpinTimer: this.tSpinTimer
        };
    }
}
