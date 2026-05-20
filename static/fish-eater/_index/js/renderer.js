import { COLORS, PLAYER_CONFIG, LEVELS, ANIMATION_CONFIG } from './config.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.bubbles = [];
        this.seaweeds = [];
        this.time = 0;
        this.lastFrameTime = performance.now();
        
        this._initBubbles();
        this._initSeaweeds();
    }

    _initBubbles() {
        this.bubbles = [];
        for (let i = 0; i < 15; i++) {
            this.bubbles.push({
                x: Math.random(),
                y: Math.random(),
                radius: 2 + Math.random() * 4,
                speed: ANIMATION_CONFIG.BUBBLE_SPEED + Math.random() * (ANIMATION_CONFIG.BUBBLE_SPEED_MAX - ANIMATION_CONFIG.BUBBLE_SPEED),
                alpha: 0.2 + Math.random() * 0.3
            });
        }
    }

    _initSeaweeds() {
        this.seaweeds = [];
        const seaweedColors = ['#2E7D32', '#388E3C', '#43A047', '#2E7D32', '#388E3C'];
        
        for (let i = 0; i < 10; i++) {
            this.seaweeds.push({
                x: 0.05 + i * 0.095,
                height: 60 + Math.random() * 100,
                color: seaweedColors[Math.floor(Math.random() * seaweedColors.length)],
                phase: Math.random() * Math.PI * 2,
                swaySpeed: 0.8 + Math.random() * 1.2
            });
        }
    }

    _updateTime() {
        const now = performance.now();
        const deltaTime = (now - this.lastFrameTime) / 1000;
        this.lastFrameTime = now;
        
        this.time += deltaTime * 60 * ANIMATION_CONFIG.SEAWEED_SWAY_SPEED;
    }

    _updateBubbles() {
        this.bubbles.forEach(bubble => {
            bubble.y -= bubble.speed * 0.003;
            if (bubble.y < -0.05) {
                bubble.y = 1.05;
                bubble.x = Math.random();
            }
        });
    }

    clear() {
        this._updateTime();
        this._updateBubbles();
        
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, COLORS.BACKGROUND_TOP);
        gradient.addColorStop(0.5, COLORS.BACKGROUND_MIDDLE);
        gradient.addColorStop(1, COLORS.BACKGROUND_BOTTOM);
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this._drawBubbles();
        this._drawSeaweeds();
    }

    _drawBubbles() {
        this.ctx.save();
        this.bubbles.forEach(bubble => {
            const screenX = bubble.x * this.canvas.width;
            const screenY = bubble.y * this.canvas.height;
            
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, bubble.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${bubble.alpha})`;
            this.ctx.fill();
            
            this.ctx.beginPath();
            this.ctx.arc(
                screenX - bubble.radius * 0.3, 
                screenY - bubble.radius * 0.3, 
                bubble.radius * 0.15, 
                0, 
                Math.PI * 2
            );
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            this.ctx.fill();
        });
        this.ctx.restore();
    }

    _drawSeaweeds() {
        this.ctx.save();
        
        this.seaweeds.forEach(seaweed => {
            const baseX = seaweed.x * this.canvas.width;
            const baseY = this.canvas.height;
            const height = seaweed.height;
            const amplitude = ANIMATION_CONFIG.SEAWEED_SWAY_AMPLITUDE;
            
            const sway = Math.sin(this.time * seaweed.swaySpeed * 0.05 + seaweed.phase) * amplitude;
            
            this.ctx.strokeStyle = seaweed.color;
            this.ctx.lineWidth = 7;
            this.ctx.lineCap = 'round';
            
            this.ctx.beginPath();
            this.ctx.moveTo(baseX, baseY);
            
            const cp1X = baseX + sway * 0.3;
            const cp1Y = baseY - height * 0.4;
            const cp2X = baseX + sway * 0.7;
            const cp2Y = baseY - height * 0.7;
            const endX = baseX + sway;
            const endY = baseY - height;
            
            this.ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, endX, endY);
            this.ctx.stroke();
        });
        
        this.ctx.restore();
    }

    _getFishColors(fish) {
        const species = fish.species;
        
        if (fish.isPlayer) {
            return { 
                main: species.color, 
                light: species.colorLight,
                dark: species.colorDark
            };
        }
        
        return {
            main: species.color,
            light: species.colorLight,
            dark: species.colorDark
        };
    }

    drawPowerUp(powerUp) {
        const type = powerUp.type;
        const size = powerUp.size;

        this.ctx.save();
        this.ctx.translate(powerUp.x, powerUp.y);

        const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, size);
        gradient.addColorStop(0, type.colorLight);
        gradient.addColorStop(0.7, type.color);
        gradient.addColorStop(1, type.color + '80');

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, size, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = type.color;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, size + 2, 0, Math.PI * 2);
        this.ctx.stroke();

        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        if (type.id === 'speed') {
            this.ctx.fillText('⚡', 0, 0);
        } else if (type.id === 'shield') {
            this.ctx.fillText('🛡', 0, 0);
        } else if (type.id === 'shrink') {
            this.ctx.fillText('◆', 0, 0);
        }

        this.ctx.restore();
    }

    drawFish(fish, effectiveSize = null, hasShield = false) {
        const colors = this._getFishColors(fish);
        const size = effectiveSize || fish.size;
        
        this.ctx.save();
        this.ctx.translate(fish.x, fish.y);
        this.ctx.rotate(fish.angle);
        
        const width = size * 1.6;
        const height = size * 0.85;
        
        const bodyGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, width / 2);
        bodyGradient.addColorStop(0, colors.light);
        bodyGradient.addColorStop(1, colors.main);
        
        this.ctx.fillStyle = bodyGradient;
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, width / 2, height / 2, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = colors.main;
        this.ctx.beginPath();
        this.ctx.moveTo(-width / 2, 0);
        this.ctx.lineTo(-width / 2 - size * 0.45, -height * 0.45);
        this.ctx.lineTo(-width / 2 - size * 0.35, 0);
        this.ctx.lineTo(-width / 2 - size * 0.45, height * 0.45);
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.fillStyle = colors.light;
        this.ctx.beginPath();
        this.ctx.moveTo(-size * 0.1, -height / 2);
        this.ctx.lineTo(size * 0.15, -height / 2 - size * 0.35);
        this.ctx.lineTo(size * 0.25, -height / 2);
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.fillStyle = colors.light;
        this.ctx.beginPath();
        this.ctx.moveTo(-size * 0.3, height / 2 * 0.3);
        this.ctx.lineTo(-size * 0.15, height / 2 * 0.3 + size * 0.25);
        this.ctx.lineTo(0, height / 2 * 0.3);
        this.ctx.closePath();
        this.ctx.fill();
        
        const eyeX = width * 0.28;
        const eyeY = -height * 0.12;
        const eyeRadius = size * 0.14;
        
        this.ctx.fillStyle = COLORS.EYE_WHITE;
        this.ctx.beginPath();
        this.ctx.arc(eyeX, eyeY, eyeRadius, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = COLORS.EYE_PUPIL;
        this.ctx.beginPath();
        this.ctx.arc(eyeX + eyeRadius * 0.25, eyeY, eyeRadius * 0.55, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.strokeStyle = colors.dark;
        this.ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
            const scaleX = -size * 0.12 - i * size * 0.07;
            const scaleY = size * 0.06;
            this.ctx.beginPath();
            this.ctx.ellipse(scaleX, 0, scaleY, scaleY, 0, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        
        if (fish.isPlayer && fish.isInvincible && fish.isInvincible()) {
            const pulse = Math.sin(performance.now() * 0.01) * 0.3 + 0.7;
            this.ctx.strokeStyle = `rgba(255, 215, 0, ${pulse * 0.6})`;
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.ellipse(0, 0, width / 2 + 8, height / 2 + 8, 0, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        if (fish.isPlayer && hasShield) {
            const pulse = Math.sin(performance.now() * 0.008) * 0.2 + 0.8;
            this.ctx.strokeStyle = `rgba(33, 150, 243, ${pulse * 0.7})`;
            this.ctx.lineWidth = 4;
            this.ctx.beginPath();
            this.ctx.ellipse(0, 0, width / 2 + 12, height / 2 + 12, 0, 0, Math.PI * 2);
            this.ctx.stroke();
            
            this.ctx.fillStyle = `rgba(33, 150, 243, ${pulse * 0.15})`;
            this.ctx.beginPath();
            this.ctx.ellipse(0, 0, width / 2 + 12, height / 2 + 12, 0, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.restore();
    }

    drawUI(player, levelProgress = null, activeEffects = []) {
        const level = player.getLevel();
        const hpPercent = (player.hp / PLAYER_CONFIG.INITIAL_HP) * 100;
        const isInvincible = player.isInvincible && player.isInvincible();
        const species = player.species;
        
        this.ctx.save();
        
        this.ctx.fillStyle = COLORS.UI_BACKGROUND;
        this.ctx.fillRect(20, 20, 220, 140);
        this.ctx.strokeStyle = '#4FC3F7';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(20, 20, 220, 140);
        
        this.ctx.fillStyle = COLORS.UI_TEXT;
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`等级: ${level}`, 30, 45);
        this.ctx.fillStyle = COLORS.SCORE_TEXT;
        this.ctx.fillText(`分数: ${player.score}`, 130, 45);
        
        this.ctx.fillStyle = species.color;
        this.ctx.font = '14px Arial';
        this.ctx.fillText(`种类: ${species.name}`, 30, 68);
        
        this.ctx.fillStyle = COLORS.UI_TEXT;
        this.ctx.fillText(`血量:`, 30, 90);
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(80, 78, 130, 16);
        
        let hpColor = '#4CAF50';
        if (hpPercent < 30) hpColor = '#F44336';
        else if (hpPercent < 60) hpColor = '#FF9800';
        this.ctx.fillStyle = hpColor;
        this.ctx.fillRect(80, 78, 130 * (hpPercent / 100), 16);
        
        if (levelProgress) {
            this.ctx.fillStyle = COLORS.UI_TEXT;
            this.ctx.font = '14px Arial';
            this.ctx.fillText(`升级:`, 30, 115);
            
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(70, 103, 160, 14);
            
            this.ctx.fillStyle = '#FFD700';
            this.ctx.fillRect(70, 103, 160 * levelProgress.progress, 14);
            
            this.ctx.strokeStyle = '#FFA500';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(70, 103, 160, 14);
            
            if (levelProgress.progress < 1) {
                this.ctx.fillStyle = COLORS.UI_TEXT;
                this.ctx.font = '10px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(`→ ${levelProgress.nextLevel}级`, 150, 114);
            } else {
                this.ctx.fillStyle = '#FFD700';
                this.ctx.font = '10px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('满级!', 150, 114);
            }
        }
        
        this.ctx.fillStyle = COLORS.UI_TEXT;
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`大小: ${Math.round(player.size)}`, 30, 145);
        
        if (isInvincible) {
            this.ctx.fillStyle = 'rgba(255, 215, 0, 0.9)';
            this.ctx.font = 'bold 16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('⭐ 无敌状态 ⭐', this.canvas.width / 2, 50);
        }
        
        if (activeEffects.length > 0) {
            let effectY = 175;
            activeEffects.forEach(effect => {
                this.ctx.fillStyle = effect.color;
                this.ctx.font = 'bold 14px Arial';
                this.ctx.textAlign = 'left';
                let text = `${effect.name}`;
                if (effect.remaining !== null) {
                    text += `: ${effect.remaining}秒`;
                } else {
                    text += `: 激活`;
                }
                this.ctx.fillText(text, 30, effectY);
                effectY += 22;
            });
        }
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(this.canvas.width - 170, 20, 150, 40);
        this.ctx.strokeStyle = '#666';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(this.canvas.width - 170, 20, 150, 40);
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '13px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('提示：同种颜色鱼大小相近', this.canvas.width - 160, 42);
        
        this.ctx.restore();
    }

    drawLeaderboard(entries) {
        this.clear();
        
        this.ctx.save();
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = COLORS.UI_BACKGROUND;
        this.ctx.fillRect(centerX - 250, centerY - 250, 500, 500);
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(centerX - 250, centerY - 250, 500, 500);
        
        this.ctx.fillStyle = COLORS.SCORE_TEXT;
        this.ctx.font = 'bold 36px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🏆 排行榜 🏆', centerX, centerY - 200);
        
        if (entries.length === 0) {
            this.ctx.fillStyle = COLORS.UI_TEXT;
            this.ctx.font = '18px Arial';
            this.ctx.fillText('暂无记录，快去游戏吧！', centerX, centerY);
        } else {
            this.ctx.fillStyle = '#AAA';
            this.ctx.font = '14px Arial';
            this.ctx.fillText('排名', centerX - 180, centerY - 155);
            this.ctx.fillText('分数', centerX, centerY - 155);
            this.ctx.fillText('等级', centerX + 160, centerY - 155);
            
            entries.forEach((entry, index) => {
                const y = centerY - 125 + index * 35;
                
                let rankColor = COLORS.UI_TEXT;
                if (index === 0) rankColor = '#FFD700';
                else if (index === 1) rankColor = '#C0C0C0';
                else if (index === 2) rankColor = '#CD7F32';
                
                this.ctx.fillStyle = rankColor;
                this.ctx.font = 'bold 16px Arial';
                this.ctx.textAlign = 'left';
                this.ctx.fillText(`${index + 1}.`, centerX - 190, y);
                
                this.ctx.fillStyle = COLORS.SCORE_TEXT;
                this.ctx.textAlign = 'center';
                this.ctx.fillText(`${entry.score}`, centerX, y);
                
                this.ctx.fillStyle = '#4CAF50';
                this.ctx.textAlign = 'right';
                this.ctx.fillText(`${entry.level}级`, centerX + 190, y);
            });
        }
        
        this.ctx.fillStyle = COLORS.BUTTON_BG;
        this.ctx.beginPath();
        this.ctx.roundRect(centerX - 80, centerY + 200, 160, 45, 10);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 18px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('关闭', centerX, centerY + 228);
        
        this.ctx.restore();
    }

    drawStartScreen(useMouseControl = true) {
        this.clear();
        
        this.ctx.save();
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        this.ctx.fillStyle = COLORS.UI_BACKGROUND;
        this.ctx.fillRect(centerX - 300, centerY - 250, 600, 500);
        this.ctx.strokeStyle = '#4FC3F7';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(centerX - 300, centerY - 250, 600, 500);
        
        this.ctx.fillStyle = COLORS.SCORE_TEXT;
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🐟 大鱼吃小鱼 🐟', centerX, centerY - 180);
        
        this.ctx.fillStyle = useMouseControl ? '#4CAF50' : '#FF9800';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.fillText(`当前操作：${useMouseControl ? '🖱️ 鼠标控制' : '⌨️ 键盘控制'}`, centerX, centerY - 150);
        this.ctx.fillStyle = '#AAA';
        this.ctx.font = '13px Arial';
        this.ctx.fillText('按 Tab 键切换操作方式', centerX, centerY - 130);
        
        this.ctx.fillStyle = COLORS.UI_TEXT;
        this.ctx.font = '18px Arial';
        this.ctx.fillText('━━━━━━━━━━━━━━━━━━━━━━━', centerX, centerY - 100);
        
        this.ctx.font = '16px Arial';
        this.ctx.fillText('游戏规则:', centerX, centerY - 75);
        this.ctx.fillText('• 吃掉比你小的鱼会加分长大', centerX, centerY - 50);
        this.ctx.fillText('• 被比你大的鱼碰到会扣血', centerX, centerY - 25);
        this.ctx.fillText('• 同体型的鱼会互相弹开', centerX, centerY);
        
        this.ctx.fillStyle = '#AAA';
        this.ctx.font = '14px Arial';
        this.ctx.fillText('提示：同种颜色的鱼大小相近，方便目测判断', centerX, centerY + 35);
        
        this.ctx.fillText('━━━━━━━━━━━━━━━━━━━━━━━', centerX, centerY + 70);
        
        this.ctx.fillStyle = COLORS.UI_TEXT;
        this.ctx.font = '14px Arial';
        this.ctx.fillText('鱼类等级（从小到大）：', centerX, centerY + 100);
        
        const fishNames = ['沙丁鱼', '金鱼', '鳟鱼', '鲤鱼', '鲈鱼', '三文鱼', '金枪鱼', '马林鱼', '剑鱼', '鲨鱼', '虎鲸'];
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = '#AAA';
        this.ctx.fillText(fishNames.join(' → '), centerX, centerY + 125);
        
        this.ctx.fillStyle = COLORS.BUTTON_BG;
        this.ctx.beginPath();
        this.ctx.roundRect(centerX - 120, centerY + 160, 240, 55, 12);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 26px Arial';
        this.ctx.fillText('开始游戏', centerX, centerY + 195);
        
        this.ctx.restore();
    }

    drawGameOver(player, rank = -1, useMouseControl = true) {
        this.ctx.save();
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = COLORS.UI_BACKGROUND;
        this.ctx.fillRect(centerX - 280, centerY - 230, 560, 480);
        this.ctx.strokeStyle = '#F44336';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(centerX - 280, centerY - 230, 560, 480);
        
        this.ctx.fillStyle = '#F44336';
        this.ctx.font = 'bold 44px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('游戏结束', centerX, centerY - 170);
        
        if (rank >= 0 && rank < 10) {
            this.ctx.fillStyle = '#FFD700';
            this.ctx.font = 'bold 18px Arial';
            const rankText = rank === 0 ? '🎉 新纪录！第1名！' : `🎉 第${rank + 1}名！`;
            this.ctx.fillText(rankText, centerX, centerY - 140);
        }
        
        this.ctx.fillStyle = useMouseControl ? '#4CAF50' : '#FF9800';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.fillText(`当前操作：${useMouseControl ? '🖱️ 鼠标控制' : '⌨️ 键盘控制'}`, centerX, centerY - 115);
        this.ctx.fillStyle = '#AAA';
        this.ctx.font = '12px Arial';
        this.ctx.fillText('按 Tab 键切换操作方式', centerX, centerY - 95);
        
        this.ctx.fillStyle = COLORS.UI_TEXT;
        this.ctx.font = '20px Arial';
        this.ctx.fillText('最终等级', centerX, centerY - 55);
        this.ctx.fillStyle = COLORS.SCORE_TEXT;
        this.ctx.font = 'bold 38px Arial';
        this.ctx.fillText(`等级 ${player.getLevel()}`, centerX, centerY - 15);
        
        this.ctx.fillStyle = player.species.color;
        this.ctx.font = '18px Arial';
        this.ctx.fillText(`最终种类: ${player.species.name}`, centerX, centerY + 25);
        
        this.ctx.fillStyle = COLORS.UI_TEXT;
        this.ctx.font = '20px Arial';
        this.ctx.fillText('最终分数', centerX, centerY + 65);
        this.ctx.fillStyle = COLORS.SCORE_TEXT;
        this.ctx.font = 'bold 38px Arial';
        this.ctx.fillText(`${player.score} 分`, centerX, centerY + 105);
        
        this.ctx.fillStyle = '#9C27B0';
        this.ctx.beginPath();
        this.ctx.roundRect(centerX - 80, centerY + 135, 160, 45, 10);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 18px Arial';
        this.ctx.fillText('🏆 排行榜', centerX, centerY + 163);
        
        this.ctx.fillStyle = COLORS.BUTTON_BG;
        this.ctx.beginPath();
        this.ctx.roundRect(centerX - 110, centerY + 195, 220, 55, 12);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.fillText('重新开始', centerX, centerY + 230);
        
        this.ctx.restore();
    }

    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
    }
}
