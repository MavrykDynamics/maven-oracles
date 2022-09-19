import { Property } from 'ts-convict';

export class OracleConfig {
  @Property({
    default: '',
    env: 'P2P_BOOTSTRAP_PEERS',
    format: String
  })
  public bootstrapPeers: string;

  @Property({
    default: '0.0.0.0',
    env: 'P2P_LISTEN_ADDRESS',
    format: String
  })
  public peerListenAddress: string;

  @Property({
    default: '23456',
    env: 'P2P_LISTEN_PORT',
    format: String
  })
  public peerListenPort: string;

  @Property({
    default: '',
    env: 'P2P_PEER_ID',
    format: String
  })
  public peerId: string;

  @Property({
    default: '',
    env: 'P2P_PEER_PUBLIC_KEY',
    format: String
  })
  public peerPubKey: string;

  @Property({
    default: '',
    env: 'P2P_PEER_PRIVATE_KEY',
    format: String
  })
  public peerPrivateKey: string;

  @Property({
    default: '',
    env: 'AGGREGATOR_FACTORY_SMART_CONTRACT_ADDRESS',
    format: String
  })
  public aggregatorFactoryAddress: string;

  @Property({
    default: 'https://ithacanet.ecadinfra.com/',
    env: 'RPC_URL',
    format: String
  })
  public rpcUrl: string;

  @Property({
    default: '',
    env: 'TEZOS_ADDRESS',
    format: String
  })
  public tezosAddress: string;

  @Property({
    default: false,
    env: 'USE_FAKE_PRICES',
    format: Boolean
  })
  public useFakePrices: boolean;
}
