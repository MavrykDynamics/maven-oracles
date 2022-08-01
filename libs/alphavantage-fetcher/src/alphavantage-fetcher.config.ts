import { Property } from 'ts-convict';

export class AlphavantageFetcherConfig {
  @Property({
    default: '',
    env: 'ALPHAVANTAGE_API_KEY',
    format: String
  })
  public alphavantageApiKey: string;

  @Property({
    default: 1,
    env: 'ALPHAVANTAGE_INTERVAL',
    format: Number
  })
  public alphavantageInterval: number;
}
