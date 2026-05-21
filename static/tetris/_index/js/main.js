import { GAME_STATE } from './constants.js';
import { Game } from './game.js';
import { Renderer } from './renderer.js';

class TetrisGame {
    constructor() {
        this.game = new Game();
        this.renderer = new Renderer();
        this.isRunning = false;
        this.keysPressed = new Set();
        this.keyRepeatTimers = {};
        this.keyInitialDelay = 200;
        this.keyRepeatInterval = 50;

        this.init();
    }

    init() {
        this.bindEvents();
        this.updateUI();
        this.renderer.render(this.game.getState());
    }

    bindEvents() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));

        document.getElementById('start-btn').addEventListener('click', () => this.start());
        document.getElementById('pause-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('reset-btn').addEventListener('click', () => this.restart());
        document.getElementById('overlay-btn').addEventListener('click', () => this.handleOverlayButton());
    }

    handleKeyDown(e) {
        if (e.repeat) return;

        const key = e.key;

        switch (key) {
            case 'ArrowLeft':
                e.preventDefault();
                this.startKeyRepeat(key, () => this.game.moveLeft());
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.startKeyRepeat(key, () => this.game.moveRight());
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.game.setSoftDropping(true);
                this.keysPressed.add(key);
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.game.rotate();
                break;
            case ' ':
                e.preventDefault();
                this.game.hardDrop();
                break;
            case 'p':
            case 'P':
                e.preventDefault();
                this.togglePause();
                break;
            case 'c':
            case 'C':
                e.preventDefault();
                this.game.hold();
                break;
            case 'Shift':
                e.preventDefault();
                this.game.hold();
                break;
        }
    }

    startKeyRepeat(key, action) {
        action();
        this.keysPressed.add(key);

        this.clearKeyRepeat(key);

        this.keyRepeatTimers[key] = setTimeout(() => {
            action();
            this.keyRepeatTimers[key] = setInterval(() => {
                if (this.keysPressed.has(key)) {
                    action();
                } else {
                    this.clearKeyRepeat(key);
                }
            }, this.keyRepeatInterval);
        }, this.keyInitialDelay);
    }

    clearKeyRepeat(key) {
        if (this.keyRepeatTimers[key]) {
            clearTimeout(this.keyRepeatTimers[key]);
            clearInterval(this.keyRepeatTimers[key]);
            delete this.keyRepeatTimers[key];
        }
    }

    handleKeyUp(e) {
        const key = e.key;
        this.keysPressed.delete(key);

        if (key === 'ArrowDown') {
            this.game.setSoftDropping(false);
        }

        if (key === 'ArrowLeft' || key === 'ArrowRight') {
            this.clearKeyRepeat(key);
        }
    }

    start() {
        if (this.game.state === GAME_STATE.READY || this.game.state === GAME_STATE.GAME_OVER) {
            this.game.start();
            this.isRunning = true;
            this.renderer.hideOverlay();
            this.gameLoop();
        }
    }

    togglePause() {
        if (this.game.state === GAME_STATE.PLAYING) {
            this.game.togglePause();
            this.renderer.showPause();
            this.updateUI();
        } else if (this.game.state === GAME_STATE.PAUSED) {
            this.game.togglePause();
            this.renderer.hideOverlay();
            this.lastTime = performance.now();
        }
    }

    restart() {
        this.game.restart();
        this.isRunning = true;
        this.renderer.hideOverlay();
        this.gameLoop();
    }

    handleOverlayButton() {
        const state = this.game.state;
        if (state === GAME_STATE.PAUSED) {
            this.togglePause();
        } else if (state === GAME_STATE.GAME_OVER) {
            this.restart();
        }
    }

    gameLoop() {
        if (!this.isRunning) return;

        const timestamp = performance.now();

        this.game.update(timestamp);

        const state = this.game.getState();
        this.renderer.render(state);
        this.renderer.updateUI(state);

        if (state.gameState === GAME_STATE.GAME_OVER) {
            this.isRunning = false;
            const isNewRecord = state.score >= state.highScore && state.score > 0;
            this.renderer.showGameOver(state.score, state.highScore, isNewRecord, state.maxCombo);
            return;
        }

        requestAnimationFrame(() => this.gameLoop());
    }

    updateUI() {
        this.renderer.updateUI(this.game.getState());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TetrisGame();
});
