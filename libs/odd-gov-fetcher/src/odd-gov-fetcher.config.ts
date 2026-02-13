import { Property } from 'ts-convict';

export class OddGovFetcherConfig {
  @Property({
    default: '',
    env: 'ODD_GOV_API_ENDPOINT',
    format: String
  })
  public oddGovApiEndpoint: string;
}
