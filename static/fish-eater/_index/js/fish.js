import { PLAYER_CONFIG, AI_FISH_CONFIG, LEVELS, getSpeciesById, getSpeciesBySize, getSpeciesForPlayer, getAvailableSpeciesForAI } from './config.js';

export class Fish {
    constructor(x, y, size, isPlayer = false, species = null) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.isPlayer = isPlayer;
        
        this.vx = 0;
        this.vy = 0;
        this.angle = 0;
        
        if (isPlayer) {
            this.hp = PLAYER_CONFIG.INITIAL_HP;
            this.score = 0;
            this.targetX = x;
            this.targetY = y;
            this.invincibleUntil = 0;
            this.level = 1;
            this.species = getSpeciesForPlayer(1);
        } else {
            this.species = species || this._chooseSpecies(size);
            this.speed = AI_FISH_CONFIG.BASE_SPEED + Math.random() * 0.8;
            this._setRandomDirection();
            this.turnTimer = 0;
            this.turnInterval = 150 + Math.random() * 200;
        }
    }

    _chooseSpecies(size) {
        return getSpeciesBySize(size);
    }

    static createAI(x, y, playerSize) {
        const availableSpecies = getAvailableSpeciesForAI(playerSize);
        const species = availableSpecies[Math.floor(Math.random() * availableSpecies.length)];
        
        const sizeRange = species.maxSize - species.minSize;
        const size = species.minSize + Math.random() * sizeRange;
        
        return new Fish(x, y, size, false, species);
    }

    _setRandomDirection() {
        const angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
        this.angle = angle;
    }

    getLevel() {
        if (this.isPlayer) {
            for (let i = LEVELS.length - 1; i >= 0; i--) {
                if (this.size >= LEVELS[i].minSize) {
                    return LEVELS[i].level;
                }
            }
            return 1;
        }
        return 0;
    }

    updateLevel() {
        if (!this.isPlayer) return;
        
        const newLevel = this.getLevel();
        if (newLevel !== this.level) {
            this.level = newLevel;
            this.species = getSpeciesForPlayer(newLevel);
            return true;
        }
        return false;
    }

    canEat(otherFish) {
        return otherFish.size < this.size * 0.85;
    }

    grow(amount) {
        this.size = Math.min(this.size + amount, PLAYER_CONFIG.MAX_SIZE);
    }

    updatePlayer(canvasWidth, canvasHeight, speedMultiplier = 1) {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const stopDistance = this.size * 0.2;
        
        if (distance > stopDistance) {
            const speed = Math.min(distance * 0.12, PLAYER_CONFIG.SPEED * speedMultiplier);
            
            this.vx = (dx / distance) * speed;
            this.vy = (dy / distance) * speed;
            
            this.angle = Math.atan2(this.vy, this.vx);
        } else {
            this.vx *= 0.4;
            this.vy *= 0.4;
            if (Math.abs(this.vx) < 0.1) this.vx = 0;
            if (Math.abs(this.vy) < 0.1) this.vy = 0;
        }
        
        this.x += this.vx;
        this.y += this.vy;
        
        const halfSize = this.size / 2;
        this.x = Math.max(halfSize, Math.min(canvasWidth - halfSize, this.x));
        this.y = Math.max(halfSize, Math.min(canvasHeight - halfSize, this.y));
    }

    updateAI(canvasWidth, canvasHeight) {
        this.turnTimer++;
        if (this.turnTimer >= this.turnInterval) {
            this.turnTimer = 0;
            this._setRandomDirection();
        }
        
        this.x += this.vx;
        this.y += this.vy;
        
        const halfSize = this.size / 2;
        
        if (this.x < halfSize) {
            this.x = halfSize;
            this.vx = Math.abs(this.vx);
            this.angle = Math.atan2(this.vy, this.vx);
        } else if (this.x > canvasWidth - halfSize) {
            this.x = canvasWidth - halfSize;
            this.vx = -Math.abs(this.vx);
            this.angle = Math.atan2(this.vy, this.vx);
        }
        
        if (this.y < halfSize) {
            this.y = halfSize;
            this.vy = Math.abs(this.vy);
            this.angle = Math.atan2(this.vy, this.vx);
        } else if (this.y > canvasHeight - halfSize) {
            this.y = canvasHeight - halfSize;
            this.vy = -Math.abs(this.vy);
            this.angle = Math.atan2(this.vy, this.vx);
        }
    }

    collidesWith(otherFish) {
        const dx = this.x - otherFish.x;
        const dy = this.y - otherFish.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = (this.size + otherFish.size) / 2 * 0.75;
        return distance < minDistance;
    }

    setTarget(x, y) {
        this.targetX = x;
        this.targetY = y;
    }

    moveWithKeys(keyStates, canvasWidth, canvasHeight, speedMultiplier = 1) {
        let dx = 0;
        let dy = 0;
        
        if (keyStates.up) dy -= 1;
        if (keyStates.down) dy += 1;
        if (keyStates.left) dx -= 1;
        if (keyStates.right) dx += 1;
        
        if (dx !== 0 || dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            this.vx = (dx / length) * PLAYER_CONFIG.SPEED * speedMultiplier;
            this.vy = (dy / length) * PLAYER_CONFIG.SPEED * speedMultiplier;
            
            this.angle = Math.atan2(this.vy, this.vx);
        } else {
            this.vx *= 0.7;
            this.vy *= 0.7;
            if (Math.abs(this.vx) < 0.1) this.vx = 0;
            if (Math.abs(this.vy) < 0.1) this.vy = 0;
        }
        
        this.x += this.vx;
        this.y += this.vy;
        
        const halfSize = this.size / 2;
        this.x = Math.max(halfSize, Math.min(canvasWidth - halfSize, this.x));
        this.y = Math.max(halfSize, Math.min(canvasHeight - halfSize, this.y));
    }

    isInvincible() {
        return performance.now() < this.invincibleUntil;
    }

    setInvincible() {
        this.invincibleUntil = performance.now() + PLAYER_CONFIG.INVINCIBLE_TIME;
    }
}
