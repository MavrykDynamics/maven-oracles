import { MavrykToolkit } from '@mavrykdynamics/webmavryk';
import { networkConfig, AggregatorContractAbstraction, IAggregatorStorage } from '@mavrykdynamics/contracts';
import { InMemorySigner } from '@mavrykdynamics/webmavryk-signer';

describe('Integration test 1', () => {
  let toolkit: MavrykToolkit;
  let aggregatorAddress: string;
  const networkName: string = 'development';

  beforeAll(async () => {
    const aggregatorAddressArg = process.argv.filter((x) => x.startsWith('-aggregatorAddress='))[0];
    if (!aggregatorAddressArg) {
      // problem to get factory address arg
      expect(true).toBeFalsy();
    }
    aggregatorAddress = aggregatorAddressArg.split('=')[1];

    toolkit = new MavrykToolkit(networkConfig.networks[networkName].rpc);
    toolkit.setProvider({
      config: {
        confirmationPollingTimeoutSecond: networkConfig.confirmationPollingTimeoutSecond
      },
      signer: await InMemorySigner.fromSecretKey(networkConfig.networks[networkName].secretKey)
    });
  });

  it('step-1', async () => {
    // epoch should be greater than 0
    const aggregator = await toolkit.contract.at<AggregatorContractAbstraction>(aggregatorAddress);
    const storage: IAggregatorStorage = await aggregator.storage();
    expect(storage.lastCompletedData.epoch.toNumber()).toBeGreaterThan(0);
  });

  it('step-2', async () => {
    // dates difference should be greater than 1.5 minutes
    const aggregator = await toolkit.contract.at<AggregatorContractAbstraction>(aggregatorAddress);
    const storage: IAggregatorStorage = await aggregator.storage();
    const storageTime = Date.parse(storage.lastCompletedData.lastUpdatedAt) / 1000;

    const currentDate = new Date();
    const currentDateTime = currentDate.getTime() / 1000;

    const timestampDiff = Math.abs(currentDateTime - storageTime);
    expect(timestampDiff).toBeGreaterThan(90); // 1.5 min since lastCompletedData update on blockchain
  });

  it('step-3', async () => {
    // dates difference should be less than 1 minute
    const aggregator = await toolkit.contract.at<AggregatorContractAbstraction>(aggregatorAddress);
    const storage: IAggregatorStorage = await aggregator.storage();
    const storageTime = Date.parse(storage.lastCompletedData.lastUpdatedAt) / 1000;

    const currentDate = new Date();
    const currentDateTime = currentDate.getTime() / 1000;

    const timestampDiff = Math.abs(currentDateTime - storageTime);
    expect(timestampDiff).toBeLessThanOrEqual(60);
  });
});
