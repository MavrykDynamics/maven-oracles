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
    env: 'SIGNER_URL',
    format: String
  })
  public signerUrl: string;

  @Property({
    default: '',
    env: 'MAVRYK_ADDRESS',
    format: String
  })
  public mavrykPublicKeyHash: string;

  @Property({
    default: '',
    env: 'MAVRYK_SECRET_KEY',
    format: String
  })
  public mavrykSecretKey: string;

  @Property({
    default: 5000,
    env: 'MAVRYK_POLLING_INTERVAL_MILLISECONDS',
    format: Number
  })
  public pollingIntervalMilliseconds: number;
}
