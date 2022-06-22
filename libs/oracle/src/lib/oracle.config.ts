import { Property } from 'ts-convict';

export class OracleConfig {
  @Property({
    default: '',
    env: 'P2P_BOOTSTRAP_PEERS',
    format: String,
  })
  public bootstrapPeers: string;

  @Property({
    default: '0.0.0.0',
    env: 'P2P_LISTEN_ADDRESS',
    format: String,
  })
  public peerListenAddress: string;

  @Property({
    default: '23456',
    env: 'P2P_LISTEN_PORT',
    format: String,
  })
  public peerListenPort: string;

  @Property({
    default: '',
    env: 'P2P_PEER_ID',
    format: String,
  })
  public peerId: string;

  @Property({
    default: '',
    env: 'P2P_PEER_PUBLIC_KEY',
    format: String,
  })
  public peerPubKey: string;

  @Property({
    default: '',
    env: 'P2P_PEER_PRIVATE_KEY',
    format: String,
  })
  public peerPrivateKey: string;
}
