import { Property } from 'ts-convict';

export class TxManagerConfig {
  @Property({
    default: '',
    env: 'RPC_URL',
    format: String
  })
  public rpcUrl: string;

  @Property({
    default: '',
    env: 'TEZOS_SECRET_KEY',
    format: String
  })
  public tezosSecretKey: string;

  @Property({
    default: 5000,
    env: 'POLLING_INTERVAL_MILLISECONDS',
    format: Number
  })
  public pollingIntervalMilliseconds: number;
}
