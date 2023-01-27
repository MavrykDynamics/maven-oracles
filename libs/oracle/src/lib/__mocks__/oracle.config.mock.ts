import { OracleConfig } from '../oracle.config.js';
import { mockedOracleAddresses } from '../contract/__mocks__/contract.service.mock.js';

export const OracleConfigMock: OracleConfig = {
  bootstrapPeers: '',
  peerListenAddress: '',
  peerListenPort: '',
  peerId: mockedOracleAddresses[3].oraclePeerId,
  peerPubKey: mockedOracleAddresses[3].oraclePublicKey,
  peerPrivateKey: '',
  aggregatorAddresses: '',
  aggregatorPairs: '',
  rpcUrl: '',
  tezosAddress: '',
  useFakeData: false
};
