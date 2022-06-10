import { Property } from 'ts-convict';

export class TxManagerConfig {
  @Property({
    default: '',
    env: 'RPC_URL',
    format: String,
  })
  public rpcUrl: string;

  @Property({
    default: '',
    env: 'SIGNER_URL',
    format: String,
  })
  public signerUrl: string;

  @Property({
    default: 5000,
    env: 'POLLING_INTERVAL_MILLISECONDS',
    format: Number,
  })
  pollingIntervalMilliseconds: number;
}
