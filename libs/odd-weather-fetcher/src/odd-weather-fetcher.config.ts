import { Property } from 'ts-convict';

export class OddWeatherFetcherConfig {
  @Property({
    default: '',
    env: 'ODD_WEATHER_API_ENDPOINT',
    format: String
  })
  public oddWeatherApiEndpoint: string;
}