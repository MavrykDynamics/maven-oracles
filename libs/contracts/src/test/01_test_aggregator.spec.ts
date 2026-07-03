import { OriginationOperation, TezosToolkit } from '@mavrykdynamics/taquito';
import { MichelsonMap } from '@mavrykdynamics/taquito-michelson-encoder';
import {
  AggregatorFactoryCode,
  AggregatorFactoryContractAbstraction,
  IAggregatorFactoryStorage
} from '../lib/aggregatorFactory';
import { alphaPercentPerThousand, decimals, heartbeatSeconds, oracleLedger } from '../lib/accounts';
import { networkConfig } from '../lib/scripts/env';
import { InMemorySigner } from '@mavrykdynamics/taquito-signer';
import { expect } from 'chai';

describe('Create Aggregator Factory', () => {
  let toolkit: TezosToolkit;
  let opFactory: OriginationOperation;
  let aggregatorAddress: string;
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
    const aggregatorFactoryStorage: IAggregatorFactoryStorage = MichelsonMap.fromLiteral({}) as MichelsonMap<
      { 0: string; 1: string },
      string
    >;

    opFactory = await toolkit.contract.originate({
      code: AggregatorFactoryCode,
      storage: aggregatorFactoryStorage
    });

    expect(opFactory.contractAddress).to.not.be.undefined;
    aggregatorAddress = opFactory.contractAddress as string;
    await opFactory.confirmation();
    console.log('factory address: ', aggregatorAddress);
  });

  it('should create an aggregator', async () => {
    const pairs: IPair[] = [{ 0: 'USD', 1: 'BTC' }];

    for (const pair of pairs) {
      const aggregatorFactory = await toolkit.contract.at<AggregatorFactoryContractAbstraction>(
        factoryAddress
      );

      const createAggregator1Op = await aggregatorFactory.methods
        .createAggregator(pair[0], pair[1], alphaPercentPerThousand, decimals, heartbeatSeconds, oracleLedger)
        .send();

      await createAggregator1Op.confirmation();

      const storage: IAggregatorFactoryStorage = await aggregatorFactory.storage();
      expect(storage.size).to.equal(1);
      console.log(`Aggregator creation done for pair: ${pair[0]}/${pair[1]}`);
    }
  });
});
