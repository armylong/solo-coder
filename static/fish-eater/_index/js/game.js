import { Fish } from './fish.js';
import { Renderer } from './renderer.js';
import { GAME_STATES, PLAYER_CONFIG, AI_FISH_CONFIG, LEVELS } from './config.js';
import { PowerUpManager } from './powerup.js';
import { LeaderboardManager } from './leaderboard.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.renderer = new Renderer(canvas);
        this.player = null;
        this.aiFishes = [];
        this.state = GAME_STATES.IDLE;
        this.gameLoop = null;
        this.lastSpawnTime = 0;
        this.mouseX = 0;
        this.mouseY = 0;
        this.useMouseControl = true;
        
        this.keyStates = {
            up: false,
            down: false,
            left: false,
            right: false
        };

        this.powerUpManager = new PowerUpManager();
        this.leaderboardManager = new LeaderboardManager();
        this.showLeaderboard = false;

        this._init();
    }

    _init() {
        this._resizeCanvas();
        window.addEventListener('resize', () => this._resizeCanvas());
        
        this.canvas.addEventListener('mousemove', (e) => this._handleMouseMove(e));
        this.canvas.addEventListener('click', (e) => this._handleClick(e));
        
        document.addEventListener('keydown', (e) => this._handleKeyDown(e));
        document.addEventListener('keyup', (e) => this._handleKeyUp(e));
        
        this.renderer.drawStartScreen(this.useMouseControl);
    }

    _resizeCanvas() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.renderer.resize(width, height);
        
        if (this.player) {
            this.player.x = Math.min(this.player.x, width - this.player.size / 2);
            this.player.y = Math.min(this.player.y, height - this.player.size / 2);
            this.player.x = Math.max(this.player.x, this.player.size / 2);
            this.player.y = Math.max(this.player.y, this.player.size / 2);
        }
    }

    _handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = e.clientX - rect.left;
        this.mouseY = e.clientY - rect.top;
        
        if (this.state === GAME_STATES.PLAYING && this.useMouseControl) {
            this.player.setTarget(this.mouseX, this.mouseY);
        }
    }

    _handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (this.showLeaderboard) {
            const centerX = this.canvas.width / 2;
            const closeBtnX = centerX - 80;
            const closeBtnY = this.canvas.height / 2 + 200;
            const closeBtnWidth = 160;
            const closeBtnHeight = 45;
            
            if (x >= closeBtnX && x <= closeBtnX + closeBtnWidth &&
                y >= closeBtnY && y <= closeBtnY + closeBtnHeight) {
                this.showLeaderboard = false;
                if (this.state === GAME_STATES.IDLE) {
                    this.renderer.drawStartScreen(this.useMouseControl);
                } else if (this.state === GAME_STATES.GAME_OVER) {
                    this.renderer.drawGameOver(this.player, -1, this.useMouseControl);
                }
                return;
            }
        }
        
        if (this.state === GAME_STATES.IDLE || this.state === GAME_STATES.GAME_OVER) {
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            
            const startBtnX = centerX - 120;
            const startBtnY = this.state === GAME_STATES.IDLE ? centerY + 160 : centerY + 195;
            const startBtnWidth = 240;
            const startBtnHeight = 55;
            
            if (x >= startBtnX && x <= startBtnX + startBtnWidth &&
                y >= startBtnY && y <= startBtnY + startBtnHeight) {
                this.start();
                return;
            }
            
            if (this.state === GAME_STATES.GAME_OVER) {
                const leaderboardBtnX = centerX - 80;
                const leaderboardBtnY = centerY + 135;
                const leaderboardBtnWidth = 160;
                const leaderboardBtnHeight = 45;
                
                if (x >= leaderboardBtnX && x <= leaderboardBtnX + leaderboardBtnWidth &&
                    y >= leaderboardBtnY && y <= leaderboardBtnY + leaderboardBtnHeight) {
                    this.showLeaderboard = true;
                    this.renderer.drawLeaderboard(this.leaderboardManager.getEntries());
                }
            }
        }
    }

    _handleKeyDown(e) {
        if (e.code === 'Space') {
            if (this.state === GAME_STATES.IDLE || this.state === GAME_STATES.GAME_OVER) {
                if (!this.showLeaderboard) {
                    this.start();
                }
            }
            return;
        }

        if (e.code === 'Tab') {
            e.preventDefault();
            if (this.state === GAME_STATES.IDLE || this.state === GAME_STATES.GAME_OVER) {
                if (!this.showLeaderboard) {
                    this.useMouseControl = !this.useMouseControl;
                    if (this.state === GAME_STATES.IDLE) {
                        this.renderer.drawStartScreen(this.useMouseControl);
                    } else {
                        this.renderer.drawGameOver(this.player, -1, this.useMouseControl);
                    }
                }
            }
            return;
        }

        switch (e.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.keyStates.up = true;
                this.useMouseControl = false;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.keyStates.down = true;
                this.useMouseControl = false;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.keyStates.left = true;
                this.useMouseControl = false;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.keyStates.right = true;
                this.useMouseControl = false;
                break;
        }
    }

    _handleKeyUp(e) {
        switch (e.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.keyStates.up = false;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.keyStates.down = false;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.keyStates.left = false;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.keyStates.right = false;
                break;
        }
    }

    start() {
        if (this.state === GAME_STATES.PLAYING) {
            return;
        }

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        this.player = new Fish(centerX, centerY, PLAYER_CONFIG.START_SIZE, true);
        this.player.setTarget(centerX, centerY);
        
        this.aiFishes = [];
        this.lastSpawnTime = performance.now();
        this.useMouseControl = true;
        this.showLeaderboard = false;
        this.powerUpManager.reset();
        
        this.keyStates = {
            up: false,
            down: false,
            left: false,
            right: false
        };

        this.state = GAME_STATES.PLAYING;
        document.body.style.cursor = 'none';
        this._startGameLoop();
    }

    _startGameLoop() {
        if (this.gameLoop) {
            cancelAnimationFrame(this.gameLoop);
        }
        this.gameLoop = requestAnimationFrame(() => this._update());
    }

    _spawnAIFish() {
        if (this.aiFishes.length >= AI_FISH_CONFIG.MAX_COUNT) {
            return;
        }

        const side = Math.floor(Math.random() * 4);
        let x, y;
        
        const baseSize = this.player ? this.player.size : 30;
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const fish = Fish.createAI(centerX, centerY, baseSize);
        const size = fish.size;
        
        switch (side) {
            case 0:
                x = -size;
                y = Math.random() * this.canvas.height;
                break;
            case 1:
                x = this.canvas.width + size;
                y = Math.random() * this.canvas.height;
                break;
            case 2:
                x = Math.random() * this.canvas.width;
                y = -size;
                break;
            case 3:
                x = Math.random() * this.canvas.width;
                y = this.canvas.height + size;
                break;
        }

        fish.x = x;
        fish.y = y;
        
        const targetX = this.canvas.width / 2 + (Math.random() - 0.5) * this.canvas.width * 0.5;
        const targetY = this.canvas.height / 2 + (Math.random() - 0.5) * this.canvas.height * 0.5;
        const angle = Math.atan2(targetY - y, targetX - x);
        
        fish.vx = Math.cos(angle) * fish.speed;
        fish.vy = Math.sin(angle) * fish.speed;
        fish.angle = angle;

        this.aiFishes.push(fish);
    }

    _update() {
        if (this.state !== GAME_STATES.PLAYING) {
            return;
        }

        const now = performance.now();
        
        if (now - this.lastSpawnTime > AI_FISH_CONFIG.SPAWN_INTERVAL) {
            this._spawnAIFish();
            this.lastSpawnTime = now;
        }

        const speedMultiplier = this.powerUpManager.getSpeedMultiplier();
        
        if (this.useMouseControl) {
            this.player.updatePlayer(this.canvas.width, this.canvas.height, speedMultiplier);
        } else {
            const hasKeyInput = this.keyStates.up || this.keyStates.down || 
                               this.keyStates.left || this.keyStates.right;
            if (hasKeyInput) {
                this.player.moveWithKeys(this.keyStates, this.canvas.width, this.canvas.height, speedMultiplier);
            } else {
                this.player.updatePlayer(this.canvas.width, this.canvas.height, speedMultiplier);
            }
        }

        for (let i = this.aiFishes.length - 1; i >= 0; i--) {
            const fish = this.aiFishes[i];
            fish.updateAI(this.canvas.width, this.canvas.height);
            
            const isOutOfBounds = fish.x < -fish.size * 2 || 
                                   fish.x > this.canvas.width + fish.size * 2 ||
                                   fish.y < -fish.size * 2 || 
                                   fish.y > this.canvas.height + fish.size * 2;
            
            if (isOutOfBounds) {
                this.aiFishes.splice(i, 1);
            }
        }

        this.powerUpManager.update(this.canvas.width, this.canvas.height, this.player);
        
        this._checkCollisions();
        this._render();

        this.gameLoop = requestAnimationFrame(() => this._update());
    }

    _checkCollisions() {
        const shrinkRatio = this.powerUpManager.getShrinkRatio();
        
        for (let i = this.aiFishes.length - 1; i >= 0; i--) {
            const aiFish = this.aiFishes[i];
            
            let effectiveAiSize = aiFish.size;
            if (shrinkRatio < 1 && aiFish.size > this.player.size) {
                effectiveAiSize = aiFish.size * shrinkRatio;
            }
            
            if (this.player.collidesWith(aiFish)) {
                const canEat = effectiveAiSize < this.player.size * 0.85;
                const sameSize = Math.abs(effectiveAiSize - this.player.size) < this.player.size * 0.15;
                const isBigger = effectiveAiSize > this.player.size * 0.85;
                
                if (canEat) {
                    this.player.grow(PLAYER_CONFIG.GROWTH_RATE * aiFish.size / 8);
                    this.player.score += Math.floor(aiFish.size);
                    this.aiFishes.splice(i, 1);
                } else if (isBigger && !this.player.isInvincible()) {
                    if (this.powerUpManager.consumeShield()) {
                        this.aiFishes.splice(i, 1);
                        continue;
                    }
                    
                    this.player.hp -= PLAYER_CONFIG.HP_DECREASE_PER_HIT;
                    this.player.setInvincible();
                    this.aiFishes.splice(i, 1);
                    
                    if (this.player.hp <= 0) {
                        this._gameOver();
                        return;
                    }
                } else if (sameSize) {
                    this.aiFishes.splice(i, 1);
                }
            }
        }
    }

    _render() {
        this.player.updateLevel();
        
        this.renderer.clear();
        
        this.powerUpManager.powerUps.forEach(powerUp => {
            this.renderer.drawPowerUp(powerUp);
        });
        
        const shrinkRatio = this.powerUpManager.getShrinkRatio();
        
        const fishesToDraw = [...this.aiFishes, this.player];
        fishesToDraw.sort((a, b) => a.y - b.y);
        
        fishesToDraw.forEach(fish => {
            let effectiveSize = fish.size;
            if (shrinkRatio < 1 && !fish.isPlayer && fish.size > this.player.size) {
                effectiveSize = fish.size * shrinkRatio;
            }
            const hasShield = fish.isPlayer && this.powerUpManager.hasShield();
            this.renderer.drawFish(fish, effectiveSize, hasShield);
        });
        
        const levelProgress = this._getLevelProgress(this.player);
        const activeEffects = this.powerUpManager.getActiveEffectsInfo();
        this.renderer.drawUI(this.player, levelProgress, activeEffects);
    }

    _gameOver() {
        this.state = GAME_STATES.GAME_OVER;
        document.body.style.cursor = 'default';
        if (this.gameLoop) {
            cancelAnimationFrame(this.gameLoop);
            this.gameLoop = null;
        }
        
        const rank = this.leaderboardManager.addEntry(this.player.score, this.player.getLevel());
        this.renderer.drawGameOver(this.player, rank, this.useMouseControl);
    }

    _getLevelProgress(player) {
        const currentLevel = player.getLevel();
        const levelConfig = LEVELS[currentLevel - 1];
        const nextLevelConfig = LEVELS[currentLevel];
        
        if (!nextLevelConfig) {
            return { progress: 1, currentLevel, nextLevel: currentLevel };
        }
        
        const currentSize = player.size;
        const minSize = levelConfig.minSize;
        const maxSize = nextLevelConfig.minSize;
        
        const progress = (currentSize - minSize) / (maxSize - minSize);
        return { 
            progress: Math.min(1, Math.max(0, progress)), 
            currentLevel, 
            nextLevel: currentLevel + 1 
        };
    }
}
