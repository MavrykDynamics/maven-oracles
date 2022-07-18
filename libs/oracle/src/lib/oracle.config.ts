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

  @Property({
    default: 'KT1GUDunHUxUv3Hx85hJZyhWLKw8QsR3rntX',
    env: 'AGGREGATOR_ADDRESS',
    format: String,
  })
  public aggregatorAddress: string;

  @Property({
    default: 'https://rpc.tzkt.io/jakartanet/',
    env: 'RPC_URL',
    format: String,
  })
  public rpcUrl: string;

  @Property({
    default: '',
    env: 'TEZOS_SECRET_KEY',
    format: String,
  })
  public tezosSecretKey: string;

  @Property({
    default: '',
    env: 'TEZOS_PUBLIC_KEY',
    format: String,
  })
  public tezosPublicKey: string;

  @Property({
    default: '',
    env: 'TEZOS_ADDRESS',
    format: String,
  })
  public tezosAddress: string;

  @Property({
    default: '',
    env: 'MESSARI_API_KEY',
    format: String,
  })
  public messariApiKey: string;

  @Property({
    default: '',
    env: 'COINGECKO_API_KEY',
    format: String,
  })
  public coingeckoApiKey: string;

  @Property({
    default: '',
    env: 'ALPHAVANTAGE_API_KEY',
    format: String,
  })
  public alphavantageApiKey: string;

  @Property({
    default: 1,
    env: 'ALPHAVANTAGE_INTERVAL',
    format: Number,
  })
  public alphavantageInterval: number;

  @Property({
    default: true,
    env: 'USE_FAKE_PRICES',
    format: Boolean,
  })
  public useFakePrices: boolean;
}
