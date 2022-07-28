import { OriginationOperation, TezosToolkit } from '@taquito/taquito';
import { MichelsonMap } from '@taquito/michelson-encoder';
import {
  AggregatorFactoryCode,
  AggregatorFactoryContractAbstraction,
  AggregatorFactoryStorage,
  PairType
} from '../lib/aggregatorFactory';
import { alphaPercentPerThousand, decimals, heartBeatSeconds, oracleAddresses } from '../lib/accounts';
import { networkConfig } from '../lib/scripts/env';
import { InMemorySigner } from '@taquito/signer';
import { expect } from 'chai';

describe('Create Aggregator Factory', () => {
  let toolkit: TezosToolkit;
  let opFactory: OriginationOperation;
  let factoryAddress: string;
  before('setup', async () => {
    const networkName = 'development';
    toolkit = new TezosToolkit(networkConfig.networks[networkName].rpc);
    toolkit.setProvider({
      config: {
        confirmationPollingTimeoutSecond: networkConfig.confirmationPollingTimeoutSecond
      },
      signer: await InMemorySigner.fromSecretKey(networkConfig.networks[networkName].secretKey)
    });
  });
  it('should deploy', async () => {
    const aggregatorFactoryStorage: AggregatorFactoryStorage = MichelsonMap.fromLiteral({}) as MichelsonMap<
      { 0: string; 1: string },
      string
    >;

    opFactory = await toolkit.contract.originate({
      code: AggregatorFactoryCode,
      storage: aggregatorFactoryStorage
    });

    expect(opFactory.contractAddress).to.not.be.undefined;
    factoryAddress = opFactory.contractAddress as string;
    await opFactory.confirmation();
    console.log('factory address: ', factoryAddress);
  });

  it('should create an aggregator', async () => {
    const pairs: PairType[] = [{ 0: 'USD', 1: 'BTC' }];

    for (const pair of pairs) {
      const aggregatorFactory = await toolkit.contract.at<AggregatorFactoryContractAbstraction>(
        factoryAddress
      );

      const createAggregator1Op = await aggregatorFactory.methods
        .createAggregator(
          pair[0],
          pair[1],
          alphaPercentPerThousand,
          decimals,
          heartBeatSeconds,
          oracleAddresses
        )
        .send();

      await createAggregator1Op.confirmation();

      const storage: AggregatorFactoryStorage = await aggregatorFactory.storage();
      expect(storage.size).to.equal(1);
      console.log(`Aggregator creation done for pair: ${pair[0]}/${pair[1]}`);
    }
  });
});
