import { CONFIG } from './config.js';

export class Clock {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const size = Math.min(window.innerWidth * 0.8, 400);
    this.canvas.width = size;
    this.canvas.height = size;
    this.radius = size / 2 - 10;
    this.centerX = size / 2;
    this.centerY = size / 2;
  }

  draw() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const milliseconds = now.getMilliseconds();

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawFace();
    this.drawTicks();
    this.drawNumbers();
    this.drawHourHand(hours, minutes);
    this.drawMinuteHand(minutes, seconds);
    this.drawSecondHand(seconds, milliseconds);
    this.drawCenterDot();
  }

  drawFace() {
    const gradient = this.ctx.createRadialGradient(
      this.centerX, this.centerY, 0,
      this.centerX, this.centerY, this.radius
    );
    gradient.addColorStop(0, '#2d3748');
    gradient.addColorStop(1, '#1a202c');

    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = gradient;
    this.ctx.fill();

    this.ctx.strokeStyle = '#4a5568';
    this.ctx.lineWidth = 4;
    this.ctx.stroke();
  }

  drawTicks() {
    for (let i = 0; i < 60; i++) {
      const angle = (i * Math.PI) / 30;
      const isHour = i % 5 === 0;
      const innerRadius = isHour ? this.radius - 25 : this.radius - 15;
      const outerRadius = this.radius - 8;

      this.ctx.beginPath();
      this.ctx.moveTo(
        this.centerX + innerRadius * Math.cos(angle),
        this.centerY + innerRadius * Math.sin(angle)
      );
      this.ctx.lineTo(
        this.centerX + outerRadius * Math.cos(angle),
        this.centerY + outerRadius * Math.sin(angle)
      );
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = isHour ? 3 : 1;
      this.ctx.stroke();
    }
  }

  drawNumbers() {
    this.ctx.font = `bold ${this.radius * 0.18}px Arial`;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    for (let i = 1; i <= 12; i++) {
      const angle = (i * Math.PI) / 6 - Math.PI / 2;
      const x = this.centerX + (this.radius - 45) * Math.cos(angle);
      const y = this.centerY + (this.radius - 45) * Math.sin(angle);
      this.ctx.fillText(i.toString(), x, y);
    }
  }

  drawHourHand(hours, minutes) {
    const hourAngle = ((hours % 12 + minutes / 60) * Math.PI) / 6 - Math.PI / 2;
    const handLength = this.radius * 0.5;

    this.ctx.save();
    this.ctx.translate(this.centerX, this.centerY);
    this.ctx.rotate(hourAngle);
    this.ctx.beginPath();
    this.ctx.moveTo(-8, 0);
    this.ctx.lineTo(-8, -handLength * 0.3);
    this.ctx.lineTo(0, -handLength);
    this.ctx.lineTo(8, -handLength * 0.3);
    this.ctx.lineTo(8, 0);
    this.ctx.closePath();
    this.ctx.fillStyle = '#e2e8f0';
    this.ctx.fill();
    this.ctx.restore();
  }

  drawMinuteHand(minutes, seconds) {
    const minuteAngle = ((minutes + seconds / 60) * Math.PI) / 30 - Math.PI / 2;
    const handLength = this.radius * 0.7;

    this.ctx.save();
    this.ctx.translate(this.centerX, this.centerY);
    this.ctx.rotate(minuteAngle);
    this.ctx.beginPath();
    this.ctx.moveTo(-5, 0);
    this.ctx.lineTo(-5, -handLength * 0.2);
    this.ctx.lineTo(0, -handLength);
    this.ctx.lineTo(5, -handLength * 0.2);
    this.ctx.lineTo(5, 0);
    this.ctx.closePath();
    this.ctx.fillStyle = '#cbd5e0';
    this.ctx.fill();
    this.ctx.restore();
  }

  drawSecondHand(seconds, milliseconds) {
    const secondAngle = ((seconds + milliseconds / 1000) * Math.PI) / 30 - Math.PI / 2;
    const handLength = this.radius * 0.8;

    this.ctx.save();
    this.ctx.translate(this.centerX, this.centerY);
    this.ctx.rotate(secondAngle);
    this.ctx.beginPath();
    this.ctx.moveTo(-2, handLength * 0.15);
    this.ctx.lineTo(-2, -handLength * 0.1);
    this.ctx.lineTo(0, -handLength);
    this.ctx.lineTo(2, -handLength * 0.1);
    this.ctx.lineTo(2, handLength * 0.15);
    this.ctx.closePath();
    this.ctx.fillStyle = '#e53e3e';
    this.ctx.fill();
    this.ctx.restore();
  }

  drawCenterDot() {
    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, 8, 0, Math.PI * 2);
    this.ctx.fillStyle = '#e53e3e';
    this.ctx.fill();
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  getDigitalTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  getDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const weekday = CONFIG.WEEKDAYS[now.getDay()];
    return `${year}年${month}月${day}日 ${weekday}`;
  }

  start() {
    const animate = () => {
      this.draw();
      requestAnimationFrame(animate);
    };
    animate();
  }
}
