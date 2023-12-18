type OpenWeatherState = {
  id: number
  main: string
  description: string
  icon: string
}

interface HourlyWeather {
  dt: number
  temp: number
  feels_like: number
  pressure: number
  humidity: number
  dew_point: number
  uvi: number
  clouds: number
  visibility: number
  wind_speed: number
  wind_deg: number
  wind_gust: number
  weather: OpenWeatherState[]
  pop: number
}

interface DailyWeather {
  dt: number
  sunrise: number
  sunset: number
  moonrise: number
  moonset: number
  moon_phase: number
  summary: string
  temp: {
    day: number
    min: number
    max: number
    night: number
    eve: number
    morn: number
  }
  feels_like: {
    day: number
    night: number
    eve: number
    morn: number
  }
  pressure: number
  humidity: number
  dew_point: number
  wind_speed: number
  wind_deg: number
  wind_gust: number
  weather: OpenWeatherState[]
  clouds: number
  pop: number
  uvi: number
}

export interface OpenWeatherOneCallApiResponse {
  lat: number
  lon: number
  timezone: string
  timezone_offset: number
  current: {
    dt: number
    sunrise: number
    sunset: number
    temp: number
    feels_like: number
    pressure: number
    humidity: number
    dew_point: number
    uvi: number
    clouds: number
    visibility: number
    wind_speed: number
    wind_deg: number
    wind_gust: number
    weather: OpenWeatherState[]
  }
  hourly: HourlyWeather[]
  daily: DailyWeather[]
}

export interface AirQualityApiResponse {
  status: string
  data: {
    aqi: number
    city: {
      name: string
    }
  }
}
