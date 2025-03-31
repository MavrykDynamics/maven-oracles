import { Property } from 'ts-convict';

export class CoingeckoFetcherConfig {
  @Property({
    default: '',
    env: 'COINGECKO_API_KEY',
    format: String
  })
  public coingeckoApiKey: string;

  @Property({
    default: '',
    env: 'COINGECKO_SUPPORTED_IDS',
    format: String
  })
  public coingeckoSupportedIds: string;
}
