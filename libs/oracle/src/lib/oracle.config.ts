import { Property } from 'ts-convict';

export class OracleConfig {
  @Property({
    default: '',
    env: 'P2P_BOOTSTRAP_PEERS',
    format: String,
  })
  public bootstrapPeers: string;
}
