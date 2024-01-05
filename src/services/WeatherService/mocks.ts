export const weatherApiMock = {
  lat: 12.34,
  lon: 56.78,
  timezone: 'Europe/Warsaw',
  timezone_offset: 3600,
  current: {
    dt: 1700848968,
    sunrise: 1700805653,
    sunset: 1700836319,
    temp: 0.78,
    feels_like: -3.73,
    pressure: 991,
    humidity: 91,
    dew_point: -0.46,
    uvi: 5,
    clouds: 75,
    visibility: 10000,
    wind_speed: 4.63,
    wind_deg: 270,
    weather: [
      {
        id: 803,
        main: 'Clouds',
        description: 'broken clouds',
        icon: '04n',
      },
    ],
  },
  hourly: [
    {
      dt: 1700848800,
      temp: 0.78,
      feels_like: -4.07,
      pressure: 991,
      humidity: 91,
      dew_point: -0.46,
      uvi: 0,
      clouds: 75,
      visibility: 10000,
      wind_speed: 5.24,
      wind_deg: 272,
      wind_gust: 11.75,
      weather: [
        {
          id: 803,
          main: 'Clouds',
          description: 'broken clouds',
          icon: '04n',
        },
      ],
      pop: 0,
    },
  ],
  daily: [
    {
      dt: 1700820000,
      sunrise: 1700805653,
      sunset: 1700836319,
      moonrise: 1700830920,
      moonset: 1700791500,
      moon_phase: 0.4,
      summary:
        'The day will start with partly cloudy with rain through the late morning hours, transitioning to partly cloudy with snow',
      temp: {
        day: 4.09,
        min: 0.01,
        max: 6.09,
        night: 0.01,
        eve: 1.15,
        morn: 4.08,
      },
      feels_like: {
        day: -1.37,
        night: -4.62,
        eve: -4.01,
        morn: -1.23,
      },
      pressure: 993,
      humidity: 74,
      dew_point: -0.33,
      wind_speed: 12.88,
      wind_deg: 255,
      wind_gust: 24.43,
      weather: [
        {
          id: 616,
          main: 'Snow',
          description: 'rain and snow',
          icon: '13d',
        },
      ],
      clouds: 81,
      pop: 1,
      rain: 2.86,
      snow: 0.95,
      uvi: 0.64,
    },
  ],
}

export const airQualityApiMock = {
  status: 'ok',
  data: {
    idx: '12345',
    aqi: 78,
    time: {
      iso: '2023-11-04T17:14:00Z',
    },
    city: {
      name: 'Warsaw, Poland',
    },
  },
}
