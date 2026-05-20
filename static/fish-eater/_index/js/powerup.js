import { POWERUP_CONFIG, POWERUP_TYPES } from './config.js';

export class PowerUp {
    constructor(x, y, type = null) {
        this.x = x;
        this.y = y;
        this.baseY = y;
        this.type = type || this._getRandomType();
        this.size = POWERUP_CONFIG.SIZE;
        this.createdAt = performance.now();
        this.bouncePhase = Math.random() * Math.PI * 2;
        this.active = true;
    }

    _getRandomType() {
        const types = Object.values(POWERUP_TYPES);
        return types[Math.floor(Math.random() * types.length)];
    }

    update() {
        if (!this.active) return;

        const now = performance.now();
        
        if (now - this.createdAt > POWERUP_CONFIG.LIFETIME) {
            this.active = false;
            return;
        }

        this.bouncePhase += POWERUP_CONFIG.BOUNCE_SPEED;
        this.y = this.baseY + Math.sin(this.bouncePhase) * POWERUP_CONFIG.BOUNCE_AMPLITUDE;
    }

    collidesWith(fish) {
        const dx = this.x - fish.x;
        const dy = this.y - fish.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = (this.size + fish.size) / 2;
        return distance < minDistance;
    }

    getRemainingTime() {
        const now = performance.now();
        return Math.max(0, POWERUP_CONFIG.LIFETIME - (now - this.createdAt));
    }
}

export class PowerUpManager {
    constructor() {
        this.powerUps = [];
        this.lastSpawnTime = 0;
        this.activeEffects = {
            speed: null,
            shield: false,
            shrink: null
        };
    }

    update(canvasWidth, canvasHeight, player) {
        const now = performance.now();

        if (now - this.lastSpawnTime > POWERUP_CONFIG.SPAWN_INTERVAL) {
            if (this.powerUps.length < POWERUP_CONFIG.MAX_COUNT) {
                this._spawnPowerUp(canvasWidth, canvasHeight);
            }
            this.lastSpawnTime = now;
        }

        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            powerUp.update();

            if (!powerUp.active) {
                this.powerUps.splice(i, 1);
                continue;
            }

            if (powerUp.collidesWith(player)) {
                this._applyEffect(powerUp.type);
                this.powerUps.splice(i, 1);
            }
        }

        this._updateEffects();
    }

    _spawnPowerUp(canvasWidth, canvasHeight) {
        const margin = 80;
        const x = margin + Math.random() * (canvasWidth - margin * 2);
        const y = margin + Math.random() * (canvasHeight - margin * 2);
        this.powerUps.push(new PowerUp(x, y));
    }

    _applyEffect(type) {
        const now = performance.now();

        switch (type.id) {
            case 'speed':
                this.activeEffects.speed = {
                    startTime: now,
                    duration: type.duration,
                    multiplier: type.speedMultiplier
                };
                break;
            case 'shield':
                this.activeEffects.shield = true;
                break;
            case 'shrink':
                this.activeEffects.shrink = {
                    startTime: now,
                    duration: type.duration,
                    ratio: type.shrinkRatio
                };
                break;
        }
    }

    _updateEffects() {
        const now = performance.now();

        if (this.activeEffects.speed) {
            if (now - this.activeEffects.speed.startTime > this.activeEffects.speed.duration) {
                this.activeEffects.speed = null;
            }
        }

        if (this.activeEffects.shrink) {
            if (now - this.activeEffects.shrink.startTime > this.activeEffects.shrink.duration) {
                this.activeEffects.shrink = null;
            }
        }
    }

    consumeShield() {
        if (this.activeEffects.shield) {
            this.activeEffects.shield = false;
            return true;
        }
        return false;
    }

    hasSpeedBoost() {
        return this.activeEffects.speed !== null;
    }

    getSpeedMultiplier() {
        return this.activeEffects.speed ? this.activeEffects.speed.multiplier : 1;
    }

    hasShrinkEffect() {
        return this.activeEffects.shrink !== null;
    }

    getShrinkRatio() {
        return this.activeEffects.shrink ? this.activeEffects.shrink.ratio : 1;
    }

    hasShield() {
        return this.activeEffects.shield;
    }

    getActiveEffectsInfo() {
        const now = performance.now();
        const effects = [];

        if (this.activeEffects.speed) {
            const remaining = Math.ceil((this.activeEffects.speed.duration - (now - this.activeEffects.speed.startTime)) / 1000);
            effects.push({
                type: 'speed',
                name: POWERUP_TYPES.SPEED.name,
                color: POWERUP_TYPES.SPEED.color,
                remaining
            });
        }

        if (this.activeEffects.shield) {
            effects.push({
                type: 'shield',
                name: POWERUP_TYPES.SHIELD.name,
                color: POWERUP_TYPES.SHIELD.color,
                remaining: null
            });
        }

        if (this.activeEffects.shrink) {
            const remaining = Math.ceil((this.activeEffects.shrink.duration - (now - this.activeEffects.shrink.startTime)) / 1000);
            effects.push({
                type: 'shrink',
                name: POWERUP_TYPES.SHRINK.name,
                color: POWERUP_TYPES.SHRINK.color,
                remaining
            });
        }

        return effects;
    }

    reset() {
        this.powerUps = [];
        this.lastSpawnTime = 0;
        this.activeEffects = {
            speed: null,
            shield: false,
            shrink: null
        };
    }
}
