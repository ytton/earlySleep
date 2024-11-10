import { WeatherConfig, WeatherResponse, WeatherData } from '../types/weather';

const CACHE_KEY = 'weather_cache';
const CACHE_DURATION = 30 * 60 * 1000; // 30分钟缓存

interface WeatherCache {
  data: WeatherData;
  timestamp: number;
}

function getCache(): WeatherCache | null {
  const cache = localStorage.getItem(CACHE_KEY);
  if (cache) {
    const parsedCache = JSON.parse(cache) as WeatherCache;
    const now = Date.now();

    // 检查缓存是否过期
    if (now - parsedCache.timestamp < CACHE_DURATION) {
      return parsedCache;
    }
  }
  return null;
}

function setCache(data: WeatherData): void {
  const cache: WeatherCache = {
    data,
    timestamp: Date.now()
  };
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

export async function getTomorrowWeather(config: WeatherConfig): Promise<WeatherData | null> {
  try {
    // 先检查缓存
    const cache = getCache();
    if (cache) {
      return cache.data;
    }

    // 如果没有缓存或缓存过期，则请求新数据
    const response = await fetch(
      `https://devapi.qweather.com/v7/weather/3d?location=${config.location}&key=${config.key}`
    );
    const data: WeatherResponse = await response.json();

    if (data.code === '200' && data.daily && data.daily.length > 1) {
      const tomorrow = data.daily[1];
      const weatherData: WeatherData = {
        temp: `${tomorrow.tempMin}°C ~ ${tomorrow.tempMax}°C`,
        text: tomorrow.textDay,
        icon: tomorrow.iconDay,
        windDir: tomorrow.windDirDay,
        windScale: tomorrow.windScaleDay,
        humidity: tomorrow.humidity
      };

      // 缓存数据
      setCache(weatherData);
      return weatherData;
    }
    return null;
  } catch (error) {
    console.error('获取天气数据失败:', error);
    // 如果请求失败但有缓存，返回缓存数据
    const cache = getCache();
    return cache ? cache.data : null;
  }
}

export type { WeatherData };
