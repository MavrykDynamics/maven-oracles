import { TezosToolkit } from '@taquito/taquito';
import {
  networkConfig,
  AggregatorContractAbstraction,
  AggregatorFactoryContractAbstraction,
  IAggregatorFactoryStorage,
  IAggregatorStorage
} from '@tezosdynamics/contracts';
import { InMemorySigner } from '@taquito/signer';

describe('Integration test 1', () => {
  let toolkit: TezosToolkit;
  let factoryAddress: string;
  const networkName: string = 'development';

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

  it('step-1', async () => {
    // epoch should be greater than 0
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

  it('step-2', async () => {
    // dates difference should be greater than 1.5 minutes
    const aggregatorFactory = await toolkit.contract.at<AggregatorFactoryContractAbstraction>(factoryAddress);
    const storage: IAggregatorFactoryStorage = await aggregatorFactory.storage();

    const addresses = [...storage.entries()].map(([pair, aggregatorAddress]) => {
      return aggregatorAddress;
    });
    for (const address of addresses) {
      const aggregator = await toolkit.contract.at<AggregatorContractAbstraction>(address);
      const storage: IAggregatorStorage = await aggregator.storage();
      const storageTime = Date.parse(storage.lastResult.time) / 1000;

      const currentDate = new Date();
      const currentDateTime = currentDate.getTime() / 1000;

      const timestampDiff = Math.abs(currentDateTime - storageTime);
      expect(timestampDiff).toBeGreaterThan(90); // 1.5 min since lastResult update on blockchain
    }
  });

  it('step-3', async () => {
    // dates difference should be less than 1 minute
    const aggregatorFactory = await toolkit.contract.at<AggregatorFactoryContractAbstraction>(factoryAddress);
    const storage: IAggregatorFactoryStorage = await aggregatorFactory.storage();

    const addresses = [...storage.entries()].map(([pair, aggregatorAddress]) => {
      return aggregatorAddress;
    });
    for (const address of addresses) {
      const aggregator = await toolkit.contract.at<AggregatorContractAbstraction>(address);
      const storage: IAggregatorStorage = await aggregator.storage();
      const storageTime = Date.parse(storage.lastResult.time) / 1000;

      const currentDate = new Date();
      const currentDateTime = currentDate.getTime() / 1000;

      const timestampDiff = Math.abs(currentDateTime - storageTime);
      expect(timestampDiff).toBeLessThanOrEqual(60);
    }
  });
});
