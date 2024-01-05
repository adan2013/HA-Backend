import Service from '../Service'
import axios from 'axios'
import {
  AirQualityApiResponse,
  OpenWeatherOneCallApiResponse,
} from './apiTypes'
import { WeatherServiceData } from './types'
import DataCollector from '../../helpers/DataCollector'
import formatDateTime from '../../utils/formatDateTime'

class WeatherService extends Service {
  private refetchIntervalMinutes = 30
  private historicalDataHourLimit = 24
  private historicalDataSavingFrequency = 2
  private weatherEndpoint =
    'https://api.openweathermap.org/data/3.0/onecall?lat={lat}&lon={lon}&appid={apiKey}&units=metric&exclude=minutely,alerts'
  private airQualityEndpoint =
    'https://api.waqi.info/feed/{aqiStationId}?token={aqiApiKey}'
  private readonly apiKey: string
  private readonly aqiApiKey: string
  private readonly aqiStationId: string
  private readonly lat: string
  private readonly lon: string
  private readonly tempHistory: DataCollector
  private readonly windHistory: DataCollector
  private readonly pressureHistory: DataCollector
  private readonly uviHistory: DataCollector
  private readonly aqiHistory: DataCollector

  constructor() {
    super('weather')
    const limit = Math.round(
      (this.historicalDataHourLimit * (60 / this.refetchIntervalMinutes)) /
        this.historicalDataSavingFrequency,
    )
    const freq = this.historicalDataSavingFrequency
    this.tempHistory = new DataCollector('temperature', 0, limit, freq)
    this.windHistory = new DataCollector('wind', 0, limit, freq)
    this.pressureHistory = new DataCollector('pressure', 0, limit, freq)
    this.uviHistory = new DataCollector('uvi', 0, limit, freq)
    this.aqiHistory = new DataCollector('aqi', 0, limit, freq)
    this.registerHelper(this.tempHistory)
    this.apiKey = process.env['WEATHER_API_KEY'] || ''
    this.aqiApiKey = process.env['AQI_API_KEY'] || ''
    this.aqiStationId = process.env['AQI_STATION'] || ''
    this.lat = process.env['WEATHER_LAT'] || ''
    this.lon = process.env['WEATHER_LON'] || ''
    let errorMsg
    if (!this.apiKey) {
      errorMsg = 'Weather service: API key is not set'
    }
    if (!this.aqiApiKey) {
      errorMsg = 'Weather service: air quality API key is not set'
    }
    if (!this.lat || !this.lon) {
      errorMsg = 'Weather service: coordinates are not set'
    }
    if (errorMsg) {
      console.error(errorMsg)
      this.setServiceEnabled(false)
      this.setServiceStatus('Bad config', 'red')
    } else {
      setInterval(() => {
        this.fetchWeather()
      }, 60000 * this.refetchIntervalMinutes)
      this.fetchWeather()
    }
  }

  private buildApiUrl(endpointTemplate: string) {
    return endpointTemplate
      .replace('{lat}', this.lat)
      .replace('{lon}', this.lon)
      .replace('{apiKey}', this.apiKey)
      .replace('{aqiApiKey}', this.aqiApiKey)
      .replace('{aqiStationId}', this.aqiStationId)
  }

  private parseAqiValue(apiValue: number): number {
    if (apiValue) {
      if (apiValue <= 50) {
        return 1
      } else if (apiValue <= 100) {
        return 2
      } else if (apiValue <= 150) {
        return 3
      } else if (apiValue <= 200) {
        return 4
      }
      return 5
    }
    return 1
  }

  private parseWeatherData(
    weatherData: OpenWeatherOneCallApiResponse,
    airQualityData: AirQualityApiResponse,
  ): WeatherServiceData {
    const airQualityIndexValue = this.parseAqiValue(airQualityData.data.aqi)
    this.tempHistory.saveValue(weatherData.current.temp)
    this.windHistory.saveValue(weatherData.current.wind_speed * 3.6)
    this.pressureHistory.saveValue(weatherData.current.pressure)
    this.uviHistory.saveValue(weatherData.current.uvi)
    this.aqiHistory.saveValue(airQualityIndexValue)
    return {
      timestamp: new Date().getTime(),
      aqiStationName: airQualityData.data?.city?.name || '(no-name)',
      aqiStationId: airQualityData.data?.idx.toString() || '(no-id)',
      aqiStationTime: airQualityData.data?.time.iso || '(unknown)',
      current: {
        sunrise: weatherData.current.sunrise * 1000,
        sunset: weatherData.current.sunset * 1000,
        temp: weatherData.current.temp,
        feelsLike: weatherData.current.feels_like,
        pressure: weatherData.current.pressure,
        humidity: weatherData.current.humidity,
        dewPoint: weatherData.current.dew_point,
        uvi: weatherData.current.uvi,
        aqi: airQualityIndexValue,
        clouds: weatherData.current.clouds,
        visibility: weatherData.current.visibility,
        windSpeed: weatherData.current.wind_speed * 3.6,
        windDeg: weatherData.current.wind_deg,
        windGust: weatherData.current.wind_gust * 3.6,
        weather: {
          type: weatherData.current.weather[0].main,
          icon: weatherData.current.weather[0].icon,
        },
      },
      shortForecast: weatherData.hourly.map((forecast) => ({
        timestamp: forecast.dt * 1000,
        temp: forecast.temp,
        feelsLike: forecast.feels_like,
        pressure: forecast.pressure,
        uvi: forecast.uvi,
        clouds: forecast.clouds,
        visibility: forecast.visibility,
        windSpeed: forecast.wind_speed * 3.6,
        windGust: forecast.wind_gust * 3.6,
        pop: forecast.pop * 100,
        weather: {
          type: forecast.weather[0].main,
          icon: forecast.weather[0].icon,
        },
      })),
      longForecast: weatherData.daily.map((forecast) => ({
        timestamp: forecast.dt * 1000,
        sunrise: forecast.sunrise * 1000,
        sunset: forecast.sunset * 1000,
        summary: forecast.summary,
        dayTemp: forecast.temp.day,
        nightTemp: forecast.temp.night,
        minTemp: forecast.temp.min,
        maxTemp: forecast.temp.max,
        pressure: forecast.pressure,
        windSpeed: forecast.wind_speed * 3.6,
        windGust: forecast.wind_gust * 3.6,
        clouds: forecast.clouds,
        pop: forecast.pop * 100,
        uvi: forecast.uvi,
        weather: {
          type: forecast.weather[0].main,
          icon: forecast.weather[0].icon,
        },
      })),
      historicalWeather: {
        temp: this.tempHistory.getValues(),
        windSpeed: this.windHistory.getValues(),
        pressure: this.pressureHistory.getValues(),
        uvi: this.uviHistory.getValues(),
        aqi: this.aqiHistory.getValues(),
      },
    }
  }

  fetchWeather() {
    if (this.isDisabled) {
      return Promise.resolve()
    }
    const weatherUrl = this.buildApiUrl(this.weatherEndpoint)
    const airQualityUrl = this.buildApiUrl(this.airQualityEndpoint)
    return Promise.all([axios.get(weatherUrl), axios.get(airQualityUrl)])
      .then(([weatherResponse, airQualityResponse]) => {
        const weatherData =
          weatherResponse.data as OpenWeatherOneCallApiResponse
        const airQualityData = airQualityResponse.data as AirQualityApiResponse
        if (airQualityData.status !== 'ok') {
          throw new Error(`Air quality API error ${airQualityData.data}`)
        }
        const parsedData = this.parseWeatherData(weatherData, airQualityData)
        this.setServiceData(parsedData)
        this.setServiceStatus(`Weather updated at ${formatDateTime()}`, 'green')
      })
      .catch((error) => {
        this.setServiceStatus(`Error: ${error.message}`, 'red')
      })
  }
}

export default WeatherService
