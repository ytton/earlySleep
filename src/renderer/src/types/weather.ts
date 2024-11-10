export interface WeatherConfig {
  key: string;
  location: string;
}

export interface WeatherData {
  temp: string;
  text: string;
  icon: string;
  windDir: string;
  windScale: string;
  humidity: string;
}

export interface WeatherResponse {
  code: string;
  daily: {
    tempMax: string;
    tempMin: string;
    textDay: string;
    iconDay: string;
    windDirDay: string;
    windScaleDay: string;
    humidity: string;
  }[];
}
