import { Property } from 'ts-convict';

export class CoinbaseFetcherConfig {
  // Coinbase Exchange public market-data host. No API key is required; the endpoint
  // is unauthenticated. Overridable in case the host or a proxy needs to change.
  @Property({
    default: 'https://api.exchange.coinbase.com',
    env: 'COINBASE_API_URL',
    format: String
  })
  public coinbaseApiUrl: string;
}
