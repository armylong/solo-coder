import { CONFIG, WEATHER_ICONS } from './config.js';

export class Weather {
  constructor(onUpdate, onError) {
    this.onUpdate = onUpdate;
    this.onError = onError;
    this.data = null;
  }

  async fetchWeather() {
    try {
      const response = await fetch(CONFIG.WEATHER_API_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.data = this.parseWeatherData(data);
      
      if (this.onUpdate) {
        this.onUpdate(this.data);
      }
      
      return this.data;
    } catch (error) {
      console.error('获取天气数据失败:', error);
      if (this.onError) {
        this.onError('天气数据获取失败');
      }
      return null;
    }
  }

  parseWeatherData(data) {
    if (!data || !data.current_condition || !data.current_condition[0]) {
      return null;
    }

    const current = data.current_condition[0];
    const weatherDesc = current.weatherDesc?.[0]?.value || '未知';
    const icon = this.getWeatherIcon(weatherDesc);

    return {
      temperature: current.temp_C || current.temp_F || '--',
      feelsLike: current.FeelsLikeC || current.FeelsLikeF || '--',
      weatherDesc: weatherDesc,
      weatherIcon: icon,
      humidity: current.humidity || '--',
      windSpeed: current.windspeedKmph || current.windspeedMiles || '--',
      windDir: current.winddir16Point || '',
      pressure: current.pressure || '--',
      visibility: current.visibility || '--',
      uvIndex: current.uvIndex || '--'
    };
  }

  getWeatherIcon(description) {
    for (const [key, icon] of Object.entries(WEATHER_ICONS)) {
      if (description.includes(key) || description.toLowerCase().includes(key.toLowerCase())) {
        return icon;
      }
    }
    
    const desc = description.toLowerCase();
    if (desc.includes('sun') || desc.includes('clear')) return '☀️';
    if (desc.includes('cloud')) return '☁️';
    if (desc.includes('rain') || desc.includes('shower')) return '🌧️';
    if (desc.includes('snow')) return '❄️';
    if (desc.includes('thunder') || desc.includes('storm')) return '⛈️';
    if (desc.includes('fog') || desc.includes('mist')) return '🌫️';
    if (desc.includes('wind')) return '💨';
    
    return '🌤️';
  }

  startAutoRefresh() {
    this.fetchWeather();
    setInterval(() => {
      this.fetchWeather();
    }, CONFIG.WEATHER_REFRESH_INTERVAL);
  }
}
