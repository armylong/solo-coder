/**
 * 食物模块
 * 管理食物的生成和位置
 */

import { CELL_SIZE } from './config.js';

export class Food {
    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.position = null;
    }

    generate(snake) {
        const cols = Math.floor(this.canvasWidth / CELL_SIZE);
        const rows = Math.floor(this.canvasHeight / CELL_SIZE);

        let newPosition;
        let attempts = 0;
        const maxAttempts = 100;

        do {
            newPosition = {
                x: Math.floor(Math.random() * cols),
                y: Math.floor(Math.random() * rows)
            };
            attempts++;
        } while (snake.occupiesPosition(newPosition.x, newPosition.y) && attempts < maxAttempts);

        if (snake.occupiesPosition(newPosition.x, newPosition.y)) {
            const emptyPositions = [];
            for (let x = 0; x < cols; x++) {
                for (let y = 0; y < rows; y++) {
                    if (!snake.occupiesPosition(x, y)) {
                        emptyPositions.push({ x, y });
                    }
                }
            }

            if (emptyPositions.length > 0) {
                newPosition = emptyPositions[Math.floor(Math.random() * emptyPositions.length)];
            } else {
                return;
            }
        }

        this.position = newPosition;
    }

    getPosition() {
        return this.position;
    }
}
