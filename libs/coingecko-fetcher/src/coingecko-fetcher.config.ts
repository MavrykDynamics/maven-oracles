import { Property } from 'ts-convict';

export class CoingeckoFetcherConfig {
  @Property({
    default: '',
    env: 'COINGECKO_API_KEY',
    format: String
  })
  public coingeckoApiKey: string;

  // Which Coingecko API tier the key belongs to.
  // 'demo' -> free Demo key: host api.coingecko.com, header x-cg-demo-api-key
  // 'pro'  -> any paid key (Lite/Analyst/Pro/Enterprise): host pro-api.coingecko.com, header x-cg-pro-api-key
  @Property({
    default: 'demo',
    env: 'COINGECKO_API_PLAN',
    format: String
  })
  public coingeckoApiPlan: string;

  @Property({
    default: '',
    env: 'COINGECKO_SUPPORTED_IDS',
    format: String
  })
  public coingeckoSupportedIds: string;
}
