import { Board } from './board.js';
import { Renderer } from './renderer.js';
import { CELL_SIZE, BOARD_PADDING, COLS, ROWS, GAME_STATES, SIDES, PIECES } from './config.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.renderer = new Renderer(canvas);
        this.board = new Board();
        this.currentSide = SIDES.RED;
        this.state = GAME_STATES.PLAYING;
        this.selectedPiece = null;
        this.validMoves = [];
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;

        this._init();
    }

    _init() {
        this._resizeCanvas();
        window.addEventListener('resize', () => this._resizeCanvas());
        this._render();
    }

    _resizeCanvas() {
        const pieceRadius = CELL_SIZE / 2 - 2;
        const edgePadding = pieceRadius + 5;
        const boardTotalWidth = (COLS - 1) * CELL_SIZE + edgePadding * 2;
        const boardTotalHeight = (ROWS - 1) * CELL_SIZE + edgePadding * 2;
        const statusHeight = 60;

        const baseWidth = boardTotalWidth + 40;
        const baseHeight = boardTotalHeight + statusHeight + 40;

        const scaleX = window.innerWidth / baseWidth;
        const scaleY = window.innerHeight / baseHeight;
        this.scale = Math.min(scaleX, scaleY);

        const scaledWidth = baseWidth * this.scale;
        const scaledHeight = baseHeight * this.scale;

        this.canvas.width = scaledWidth;
        this.canvas.height = scaledHeight;
        this.canvas.style.width = scaledWidth + 'px';
        this.canvas.style.height = scaledHeight + 'px';

        this.offsetX = (scaledWidth - boardTotalWidth * this.scale) / 2;
        this.offsetY = (scaledHeight - (boardTotalHeight * this.scale + statusHeight * this.scale)) / 2;

        this.renderer.updateScale(this.scale, this.offsetX, this.offsetY);
        this._render();
    }

    handleClick(x, y) {
        if (this.state !== GAME_STATES.PLAYING) {
            return;
        }

        const actualX = (x - this.offsetX) / this.scale;
        const actualY = (y - this.offsetY) / this.scale;
        const col = Math.floor((actualX - BOARD_PADDING + CELL_SIZE / 2) / CELL_SIZE);
        const row = Math.floor((actualY - BOARD_PADDING + CELL_SIZE / 2) / CELL_SIZE);

        if (col < 0 || col >= COLS || row < 0 || row >= ROWS) {
            return;
        }

        const piece = this.board.get(row, col);

        if (this.selectedPiece) {
            const isValidMove = this.validMoves.some(m => m.row === row && m.col === col);
            
            if (isValidMove) {
                this._makeMove(this.selectedPiece.row, this.selectedPiece.col, row, col);
            } else if (piece && piece.side === this.currentSide) {
                this._selectPiece(row, col, piece);
            } else {
                this._clearSelection();
            }
        } else {
            if (piece && piece.side === this.currentSide) {
                this._selectPiece(row, col, piece);
            }
        }

        this._render();
    }

    _selectPiece(row, col, piece) {
        this.selectedPiece = { row, col, piece };
        this.validMoves = this.board.getValidMoves(row, col, piece);
    }

    _clearSelection() {
        this.selectedPiece = null;
        this.validMoves = [];
    }

    _makeMove(fromRow, fromCol, toRow, toCol) {
        const captured = this.board.get(toRow, toCol);
        
        this.board.move(fromRow, fromCol, toRow, toCol);

        if (this._checkKingsFace()) {
            this.board.move(toRow, toCol, fromRow, fromCol);
            this.board.grid[toRow][toCol] = captured;
            this._clearSelection();
            this._render();
            return;
        }

        this._clearSelection();

        if (captured && captured.type === PIECES.KING) {
            this.state = captured.side === SIDES.RED ? GAME_STATES.BLACK_WIN : GAME_STATES.RED_WIN;
        } else {
            this.currentSide = this.currentSide === SIDES.RED ? SIDES.BLACK : SIDES.RED;
        }
    }

    _checkKingsFace() {
        let redKingPos = null;
        let blackKingPos = null;

        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                const piece = this.board.get(row, col);
                if (piece && piece.type === PIECES.KING) {
                    if (piece.side === SIDES.RED) {
                        redKingPos = { row, col };
                    } else {
                        blackKingPos = { row, col };
                    }
                }
            }
        }

        if (!redKingPos || !blackKingPos) {
            return false;
        }

        if (redKingPos.col !== blackKingPos.col) {
            return false;
        }

        const col = redKingPos.col;
        const minRow = Math.min(redKingPos.row, blackKingPos.row);
        const maxRow = Math.max(redKingPos.row, blackKingPos.row);

        for (let row = minRow + 1; row < maxRow; row++) {
            if (this.board.get(row, col)) {
                return false;
            }
        }

        return true;
    }

    restart() {
        this.board.reset();
        this.currentSide = SIDES.RED;
        this.state = GAME_STATES.PLAYING;
        this._clearSelection();
        this._render();
    }

    _render() {
        this.renderer.clear();
        this.renderer.drawBoard();
        this.renderer.drawPieces(this.board);
        
        if (this.selectedPiece) {
            this.renderer.drawSelection(this.selectedPiece.row, this.selectedPiece.col);
            this.renderer.drawValidMoves(this.validMoves);
        }

        this.renderer.drawStatus(this.currentSide, this.state);
    }
}
