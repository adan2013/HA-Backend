import WeatherService from './WeatherService'
import axios from 'axios'
import { airQualityApiMock, weatherApiMock } from './mocks'
import { WeatherServiceData } from './types'

const weatherApiUrl =
  'https://api.openweathermap.org/data/3.0/onecall?lat=COORDS_LAT&lon=COORDS_LON&appid=API_KEY&units=metric&exclude=minutely,alerts'
const airQualityApiUrl = 'https://api.waqi.info/feed/A12345?token=AQI_API_KEY'

jest.useFakeTimers().setSystemTime(new Date('2021-05-14T16:12:00.000'))
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

mockedAxios.get.mockImplementation((url) => {
  switch (url) {
    case weatherApiUrl:
      return Promise.resolve({ data: weatherApiMock })
    case airQualityApiUrl:
      return Promise.resolve({ data: airQualityApiMock })
    default:
      return Promise.reject(new Error('Wrong URL'))
  }
})

describe('WeatherService', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = {
      ...OLD_ENV,
      AQI_API_KEY: 'AQI_API_KEY',
      AQI_STATION: 'A12345',
      WEATHER_API_KEY: 'API_KEY',
      WEATHER_LAT: 'COORDS_LAT',
      WEATHER_LON: 'COORDS_LON',
    }
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  it('should disable sevice if one of the env variables is missing', () => {
    const initialVariables = { ...process.env }

    process.env.AQI_API_KEY = undefined
    const withoutAqiApiKey = new WeatherService()
    process.env = initialVariables

    process.env.WEATHER_API_KEY = undefined
    const withoutApiKey = new WeatherService()
    process.env = initialVariables

    process.env.WEATHER_LAT = undefined
    const withoutLat = new WeatherService()
    process.env = initialVariables

    process.env.WEATHER_LON = undefined
    const withoutLon = new WeatherService()

    expect(withoutAqiApiKey.getServiceStatus().status.enabled).toBe(false)
    expect(withoutApiKey.getServiceStatus().status.enabled).toBe(false)
    expect(withoutLat.getServiceStatus().status.enabled).toBe(false)
    expect(withoutLon.getServiceStatus().status.enabled).toBe(false)
  })

  it('should create a new instance of WeatherService with correct status', async () => {
    const weather = new WeatherService()
    await weather.fetchWeather()
    const status = weather.getServiceStatus()
    expect(status).toEqual({
      status: {
        enabled: true,
        message: 'Weather updated at 16:12 14-05-2021',
        color: 'green',
      },
      helpers: {
        'dataCollector/temperature': {
          color: 'blue',
          message: 'In queue: 1/24, Saving every 2 values',
        },
      },
    })
  })

  it('should fetch weather data', async () => {
    const weather = new WeatherService()
    await weather.fetchWeather()
    expect(mockedAxios.get).toHaveBeenCalledWith(weatherApiUrl)
    expect(mockedAxios.get).toHaveBeenCalledWith(airQualityApiUrl)
    expect(weather.getServiceData()).toMatchSnapshot()
    expect(weather.getServiceStatus().status).toEqual({
      enabled: true,
      message: 'Weather updated at 16:12 14-05-2021',
      color: 'green',
    })
  })

  it('should store historical data', async () => {
    const weather = new WeatherService()
    // it saves data every 2 values, so we need to call it 5 times
    await weather.fetchWeather()
    await weather.fetchWeather()
    await weather.fetchWeather()
    await weather.fetchWeather()
    await weather.fetchWeather()
    const historicalData = (weather.getServiceData() as WeatherServiceData)
      .historicalWeather
    expect(historicalData.temp).toHaveLength(3)
    expect(historicalData.windSpeed).toHaveLength(3)
    expect(historicalData.pressure).toHaveLength(3)
  })

  it('should set service status to error if request fails', async () => {
    mockedAxios.get.mockImplementationOnce(() => {
      return Promise.reject(new Error('ERROR_MESSAGE'))
    })
    const weather = new WeatherService()
    await weather.fetchWeather()
    expect(weather.getServiceStatus().status).toEqual({
      enabled: true,
      message: 'Error: ERROR_MESSAGE',
      color: 'red',
    })
  })

  it('should block requests if service is disabled', async () => {
    const weather = new WeatherService()
    weather.setServiceEnabled(false)
    await weather.fetchWeather()
    expect(weather.getServiceData()).toBeNull()
    expect(weather.getServiceStatus().status).toEqual({
      enabled: false,
      message: 'Ready',
      color: 'green',
    })
  })
})
