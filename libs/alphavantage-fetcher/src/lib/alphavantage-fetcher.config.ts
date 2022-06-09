import { Property } from 'ts-convict';

export class AlphavantageFetcherConfig {
  @Property({
    default: '',
    env: 'ALPHAVANTAGE_API_KEY',
    format: String,
  })
  public alphavantageApiKey: string;
}
