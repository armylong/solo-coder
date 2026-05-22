import { Clock } from './clock.js';
import { Weather } from './weather.js';
import { CONFIG } from './config.js';

class App {
  constructor() {
    this.clock = null;
    this.weather = null;
    this.currentTheme = CONFIG.DEFAULT_THEME;
  }

  init() {
    this.initTheme();
    this.initClock();
    this.initWeather();
    this.initThemeToggle();
    this.updateDigitalTime();
  }

  initTheme() {
    const savedTheme = localStorage.getItem(CONFIG.THEME_STORAGE_KEY);
    if (savedTheme) {
      this.currentTheme = savedTheme;
    }
    this.applyTheme(this.currentTheme);
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    this.currentTheme = theme;
  }

  toggleTheme() {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(newTheme);
    localStorage.setItem(CONFIG.THEME_STORAGE_KEY, newTheme);
  }

  initThemeToggle() {
    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggleTheme());
    }
  }

  initClock() {
    this.clock = new Clock('clockCanvas');
    this.clock.start();
  }

  initWeather() {
    this.weather = new Weather(
      (data) => this.updateWeatherUI(data),
      (error) => this.showWeatherError(error)
    );
    this.weather.startAutoRefresh();
  }

  updateDigitalTime() {
    const timeElement = document.getElementById('digitalTime');
    const dateElement = document.getElementById('digitalDate');

    const update = () => {
      if (timeElement) {
        timeElement.textContent = this.clock.getDigitalTime();
      }
      if (dateElement) {
        dateElement.textContent = this.clock.getDateString();
      }
      requestAnimationFrame(update);
    };
    update();
  }

  updateWeatherUI(data) {
    const weatherContainer = document.getElementById('weatherContainer');
    const errorElement = document.getElementById('weatherError');

    if (errorElement) {
      errorElement.style.display = 'none';
    }

    if (!data || !weatherContainer) return;

    const iconElement = document.getElementById('weatherIcon');
    const tempElement = document.getElementById('temperature');
    const descElement = document.getElementById('weatherDesc');
    const humidityElement = document.getElementById('humidity');
    const windElement = document.getElementById('windSpeed');

    if (iconElement) iconElement.textContent = data.weatherIcon;
    if (tempElement) tempElement.textContent = `${data.temperature}°C`;
    if (descElement) descElement.textContent = data.weatherDesc;
    if (humidityElement) humidityElement.textContent = `湿度: ${data.humidity}%`;
    if (windElement) windElement.textContent = `风速: ${data.windSpeed} km/h`;

    weatherContainer.style.display = 'block';
  }

  showWeatherError(message) {
    const weatherContainer = document.getElementById('weatherContainer');
    const errorElement = document.getElementById('weatherError');

    if (weatherContainer) {
      weatherContainer.style.display = 'none';
    }

    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = 'block';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
