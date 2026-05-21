import { COLS, ROWS, BLOCK_SIZE, NEXT_BLOCK_SIZE, COLORS } from './constants.js';

export class Renderer {
    constructor() {
        this.gameCanvas = document.getElementById('game-canvas');
        this.nextCanvas = document.getElementById('next-canvas');
        this.holdCanvas = document.getElementById('hold-canvas');
        this.gameCtx = this.gameCanvas.getContext('2d');
        this.nextCtx = this.nextCanvas.getContext('2d');
        this.holdCtx = this.holdCanvas.getContext('2d');
    }

    drawBlock(ctx, x, y, size, color, isGhost = false) {
        if (!color) return;

        if (isGhost) {
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 2, y + 2, size - 4, size - 4);
            ctx.fillStyle = color + '20';
            ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
        } else {
            ctx.fillStyle = color;
            ctx.fillRect(x, y, size, size);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(x, y, size, 4);
            ctx.fillRect(x, y, 4, size);

            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.fillRect(x, y + size - 4, size, 4);
            ctx.fillRect(x + size - 4, y, 4, size);

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, size, size);
        }
    }

    drawBoard(board) {
        const grid = board.getGrid();

        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                const x = col * BLOCK_SIZE;
                const y = row * BLOCK_SIZE;
                const color = grid[row][col];

                this.gameCtx.clearRect(x, y, BLOCK_SIZE, BLOCK_SIZE);

                this.gameCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
                this.gameCtx.lineWidth = 1;
                this.gameCtx.strokeRect(x, y, BLOCK_SIZE, BLOCK_SIZE);

                if (color) {
                    this.drawBlock(this.gameCtx, x, y, BLOCK_SIZE, color);
                }
            }
        }
    }

    drawPiece(piece, isGhost = false) {
        if (!piece) return;

        const positions = piece.getPositions();
        for (const pos of positions) {
            if (pos.y >= 0) {
                const x = pos.x * BLOCK_SIZE;
                const y = pos.y * BLOCK_SIZE;
                this.drawBlock(this.gameCtx, x, y, BLOCK_SIZE, piece.color, isGhost);
            }
        }
    }

    drawGhost(board, piece) {
        if (!piece) return;

        const ghost = board.getGhostPosition(piece);
        this.drawPiece(ghost, true);
    }

    drawNextPiece(piece) {
        this.nextCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);

        if (!piece) return;

        const shape = piece.getCurrentShape();
        const offsetX = (this.nextCanvas.width - shape[0].length * NEXT_BLOCK_SIZE) / 2;
        const offsetY = (this.nextCanvas.height - shape.length * NEXT_BLOCK_SIZE) / 2;

        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    const x = offsetX + col * NEXT_BLOCK_SIZE;
                    const y = offsetY + row * NEXT_BLOCK_SIZE;
                    this.drawBlock(this.nextCtx, x, y, NEXT_BLOCK_SIZE, piece.color);
                }
            }
        }
    }

    drawHoldPiece(piece) {
        this.holdCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.holdCtx.fillRect(0, 0, this.holdCanvas.width, this.holdCanvas.height);

        if (!piece) return;

        const shape = piece.getCurrentShape();
        const offsetX = (this.holdCanvas.width - shape[0].length * NEXT_BLOCK_SIZE) / 2;
        const offsetY = (this.holdCanvas.height - shape.length * NEXT_BLOCK_SIZE) / 2;

        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    const x = offsetX + col * NEXT_BLOCK_SIZE;
                    const y = offsetY + row * NEXT_BLOCK_SIZE;
                    this.drawBlock(this.holdCtx, x, y, NEXT_BLOCK_SIZE, piece.color);
                }
            }
        }
    }

    render(gameState) {
        const { board, currentPiece, nextPiece, holdPiece, showTSpin, tSpinTimer } = gameState;

        this.drawBoard(board);

        this.drawGhost(board, currentPiece);

        this.drawPiece(currentPiece);

        this.drawNextPiece(nextPiece);

        this.drawHoldPiece(holdPiece);

        if (showTSpin) {
            this.drawTSpinText(tSpinTimer);
        }
    }

    drawTSpinText(timer) {
        const centerX = this.gameCanvas.width / 2;
        const centerY = this.gameCanvas.height / 3;
        
        const progress = timer / 1500;
        const alpha = Math.min(1, progress * 2);
        const scale = 1 + (1 - progress) * 0.3;
        
        this.gameCtx.save();
        this.gameCtx.globalAlpha = alpha;
        this.gameCtx.translate(centerX, centerY);
        this.gameCtx.scale(scale, scale);
        
        this.gameCtx.font = 'bold 36px Arial';
        this.gameCtx.textAlign = 'center';
        this.gameCtx.textBaseline = 'middle';
        
        this.gameCtx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.gameCtx.shadowBlur = 10;
        this.gameCtx.shadowOffsetX = 3;
        this.gameCtx.shadowOffsetY = 3;
        
        this.gameCtx.fillStyle = '#ffeb3b';
        this.gameCtx.fillText('T-SPIN!', 0, 0);
        
        this.gameCtx.strokeStyle = '#ff9800';
        this.gameCtx.lineWidth = 3;
        this.gameCtx.strokeText('T-SPIN!', 0, 0);
        
        this.gameCtx.restore();
    }

    updateUI(gameState) {
        const { score, lines, level, highScore } = gameState;

        document.getElementById('score').textContent = score;
        document.getElementById('lines').textContent = lines;
        document.getElementById('level').textContent = level;
        document.getElementById('high-score').textContent = highScore;
    }

    showGameOver(score, highScore, isNewRecord, maxCombo = 0) {
        const overlay = document.getElementById('game-overlay');
        const title = document.getElementById('overlay-title');
        const message = document.getElementById('overlay-message');
        const btn = document.getElementById('overlay-btn');

        title.textContent = '游戏结束';

        let msg = `最终得分: ${score}<br>最高分: ${highScore}`;
        if (maxCombo > 0) {
            msg += `<br>最大连击: ${maxCombo}`;
        }
        if (isNewRecord) {
            msg += '<br><span class="new-record">🎉 新纪录！</span>';
        }
        message.innerHTML = msg;

        btn.textContent = '重新开始';
        overlay.classList.add('active');
    }

    showPause() {
        const overlay = document.getElementById('game-overlay');
        const title = document.getElementById('overlay-title');
        const message = document.getElementById('overlay-message');
        const btn = document.getElementById('overlay-btn');

        title.textContent = '游戏暂停';
        message.textContent = '按 P 键或点击按钮继续游戏';
        btn.textContent = '继续游戏';
        overlay.classList.add('active');
    }

    hideOverlay() {
        const overlay = document.getElementById('game-overlay');
        overlay.classList.remove('active');
    }
}
