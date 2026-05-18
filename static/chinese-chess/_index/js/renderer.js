import { CELL_SIZE, BOARD_PADDING, COLS, ROWS, COLORS, PIECE_NAMES } from './config.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
    }

    updateScale(scale, offsetX, offsetY) {
        this.scale = scale;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
    }

    clear() {
        this.ctx.fillStyle = COLORS.BACKGROUND;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.save();
        this.ctx.translate(this.offsetX, this.offsetY);
        this.ctx.scale(this.scale, this.scale);
    }

    drawBoard() {
        const padding = BOARD_PADDING;
        const boardWidth = (COLS - 1) * CELL_SIZE;
        const boardHeight = (ROWS - 1) * CELL_SIZE;
        const pieceRadius = CELL_SIZE / 2 - 2;
        const edgePadding = pieceRadius + 5;

        this.ctx.fillStyle = COLORS.BOARD;
        this.ctx.fillRect(
            padding - edgePadding,
            padding - edgePadding,
            boardWidth + edgePadding * 2,
            boardHeight + edgePadding * 2
        );

        this.ctx.strokeStyle = COLORS.LINE;
        this.ctx.lineWidth = 1;

        for (let i = 0; i < ROWS; i++) {
            if (i === 4 || i === 5) continue;
            this.ctx.beginPath();
            this.ctx.moveTo(padding, padding + i * CELL_SIZE);
            this.ctx.lineTo(padding + boardWidth, padding + i * CELL_SIZE);
            this.ctx.stroke();
        }

        this.ctx.beginPath();
        this.ctx.moveTo(padding, padding + 4 * CELL_SIZE);
        this.ctx.lineTo(padding, padding + 5 * CELL_SIZE);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(padding + boardWidth, padding + 4 * CELL_SIZE);
        this.ctx.lineTo(padding + boardWidth, padding + 5 * CELL_SIZE);
        this.ctx.stroke();

        for (let i = 0; i < COLS; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(padding + i * CELL_SIZE, padding);
            this.ctx.lineTo(padding + i * CELL_SIZE, padding + boardHeight);
            this.ctx.stroke();
        }

        this.ctx.fillStyle = COLORS.RIVER;
        this.ctx.fillRect(
            padding - edgePadding,
            padding + 4 * CELL_SIZE,
            boardWidth + edgePadding * 2,
            CELL_SIZE
        );

        this.ctx.fillStyle = COLORS.LINE;
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('楚 河', padding + boardWidth / 4, padding + 4.5 * CELL_SIZE);
        this.ctx.fillText('汉 界', padding + 3 * boardWidth / 4, padding + 4.5 * CELL_SIZE);

        this._drawPalace(padding + 3 * CELL_SIZE, padding);
        this._drawPalace(padding + 3 * CELL_SIZE, padding + 7 * CELL_SIZE);
    }

    _drawPalace(x, y) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x + 2 * CELL_SIZE, y + 2 * CELL_SIZE);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(x + 2 * CELL_SIZE, y);
        this.ctx.lineTo(x, y + 2 * CELL_SIZE);
        this.ctx.stroke();
    }

    drawPieces(board) {
        const padding = BOARD_PADDING;

        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                const piece = board.get(row, col);
                if (piece) {
                    this._drawPiece(padding + col * CELL_SIZE, padding + row * CELL_SIZE, piece);
                }
            }
        }
    }

    _drawPiece(x, y, piece) {
        const radius = CELL_SIZE / 2 - 8;

        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = '#f5deb3';
        this.ctx.fill();
        this.ctx.strokeStyle = piece.side === 'red' ? COLORS.RED : COLORS.BLACK;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.arc(x, y, radius - 4, 0, Math.PI * 2);
        this.ctx.strokeStyle = piece.side === 'red' ? COLORS.RED : COLORS.BLACK;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        this.ctx.fillStyle = piece.side === 'red' ? COLORS.RED : COLORS.BLACK;
        const fontSize = Math.floor(CELL_SIZE * 0.45);
        this.ctx.font = `bold ${fontSize}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(PIECE_NAMES[piece.side][piece.type], x, y);
    }

    drawSelection(row, col) {
        const padding = BOARD_PADDING;
        const x = padding + col * CELL_SIZE;
        const y = padding + row * CELL_SIZE;
        const radius = CELL_SIZE / 2 - 6;

        this.ctx.strokeStyle = COLORS.SELECTED;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.stroke();
    }

    drawValidMoves(moves) {
        const padding = BOARD_PADDING;
        const markerRadius = Math.floor(CELL_SIZE / 6);

        for (const move of moves) {
            const x = padding + move.col * CELL_SIZE;
            const y = padding + move.row * CELL_SIZE;

            this.ctx.fillStyle = COLORS.VALID_MOVE;
            this.ctx.beginPath();
            this.ctx.arc(x, y, markerRadius, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawStatus(currentSide, state) {
        const pieceRadius = CELL_SIZE / 2 - 2;
        const edgePadding = pieceRadius + 5;
        const boardBottom = (BOARD_PADDING - edgePadding) + (ROWS - 1) * CELL_SIZE + edgePadding * 2;

        this.ctx.restore();
        
        const statusY = boardBottom * this.scale + this.offsetY + 20;

        this.ctx.fillStyle = COLORS.TEXT;
        this.ctx.font = 'bold 20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        let text = '';
        if (state === 'red_win') {
            text = '红方获胜！';
        } else if (state === 'black_win') {
            text = '黑方获胜！';
        } else {
            text = currentSide === 'red' ? '红方走子' : '黑方走子';
        }

        this.ctx.fillText(text, this.canvas.width / 2, statusY);

        this.ctx.font = '14px Arial';
        this.ctx.fillText('按 R 重新开始', this.canvas.width / 2, statusY + 25);
    }
}
