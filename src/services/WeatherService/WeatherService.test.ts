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

const initService = () =>
  new WeatherService(
    'API_KEY',
    'COORDS_LAT',
    'COORDS_LON',
    'AQI_API_KEY',
    'A12345',
  )

describe('WeatherService', () => {
  it('should report bad config if one of the env variables is missing', () => {
    const withoutApiKey = new WeatherService(undefined, '2', '3', '4', '5')
    const withoutLat = new WeatherService('1', undefined, '3', '4', '5')
    const withoutLon = new WeatherService('1', '2', undefined, '4', '5')
    const withoutAqiApiKey = new WeatherService('1', '2', '3', undefined, '5')
    const withoutAqiStation = new WeatherService('1', '2', '3', '4', undefined)

    const services = [
      withoutApiKey,
      withoutLat,
      withoutLon,
      withoutAqiApiKey,
      withoutAqiStation,
    ]
    services.forEach((service) => {
      expect(service.getServiceStatus().status).toEqual({
        message: 'Bad config',
        color: 'red',
      })
    })
  })

  it('should create a new instance of WeatherService with correct status', async () => {
    const weather = initService()
    await weather.fetchWeather()
    const status = weather.getServiceStatus()
    expect(status).toEqual({
      status: {
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
    const weather = initService()
    await weather.fetchWeather()
    expect(mockedAxios.get).toHaveBeenCalledWith(weatherApiUrl)
    expect(mockedAxios.get).toHaveBeenCalledWith(airQualityApiUrl)
    expect(weather.getServiceData()).toMatchSnapshot()
    expect(weather.getServiceStatus().status).toEqual({
      message: 'Weather updated at 16:12 14-05-2021',
      color: 'green',
    })
  })

  it('should store historical data', async () => {
    const weather = initService()
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
    const weather = initService()
    await weather.fetchWeather()
    expect(weather.getServiceStatus().status).toEqual({
      message: 'Error: ERROR_MESSAGE',
      color: 'red',
    })
  })

  it('should not request weather data when config is invalid', async () => {
    mockedAxios.get.mockClear()
    const weather = new WeatherService(undefined, '2', '3', '4', '5')
    await weather.fetchWeather()
    expect(weather.getServiceData()).toBeNull()
    expect(mockedAxios.get).not.toHaveBeenCalled()
    expect(weather.getServiceStatus().status).toEqual({
      message: 'Bad config',
      color: 'red',
    })
  })
})
