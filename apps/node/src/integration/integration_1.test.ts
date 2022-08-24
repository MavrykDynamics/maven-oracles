import { TezosToolkit } from '@taquito/taquito';
import {
  networkConfig,
  AggregatorContractAbstraction,
  AggregatorFactoryContractAbstraction,
  IAggregatorFactoryStorage,
  IAggregatorStorage
} from '@tezosdynamics/contracts';
import { InMemorySigner } from '@taquito/signer';

describe('Integration test - oracles should have make one contract call', () => {
  let toolkit: TezosToolkit;
  let factoryAddress: string;
  let networkName: string = 'development';

  beforeAll(async () => {
    const factoryAddressArg = process.argv.filter((x) => x.startsWith('-factoryAddress='))[0];
    if (!factoryAddressArg) {
      // problem to get factory address arg
      expect(true).toBeFalsy();
    }
    factoryAddress = factoryAddressArg.split('=')[1];

    toolkit = new TezosToolkit(networkConfig.networks[networkName].rpc);
    toolkit.setProvider({
      config: {
        confirmationPollingTimeoutSecond: networkConfig.confirmationPollingTimeoutSecond
      },
      signer: await InMemorySigner.fromSecretKey(networkConfig.networks[networkName].secretKey)
    });
  });

  it('epoch should be greater than 0', async () => {
    const aggregatorFactory = await toolkit.contract.at<AggregatorFactoryContractAbstraction>(factoryAddress);
    const storage: IAggregatorFactoryStorage = await aggregatorFactory.storage();

    const addresses = [...storage.entries()].map(([pair, aggregatorAddress]) => {
      return aggregatorAddress;
    });
    for (const address of addresses) {
      const aggregator = await toolkit.contract.at<AggregatorContractAbstraction>(address);
      const storage: IAggregatorStorage = await aggregator.storage();
      expect(storage.lastResult.epoch.toNumber()).toBeGreaterThan(0);
    }
  });
});
