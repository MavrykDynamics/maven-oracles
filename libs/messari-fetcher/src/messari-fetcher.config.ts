import { Property } from 'ts-convict';

export class MessariFetcherConfig {
  @Property({
    default: '',
    env: 'MESSARI_API_KEY',
    format: String
  })
  public messariApiKey: string;

  @Property({
    default: '',
    env: 'PAIR1',
    format: String
  })
  public pair1: string;

  @Property({
    default: '',
    env: 'PAIR2',
    format: String
  })
  public pair2: string;
}
