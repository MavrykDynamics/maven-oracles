/* eslint-disable @typescript-eslint/naming-convention */
import { INetworkConfig, NetworkName } from '../scripts/env';
import { OriginationOperation, TezosToolkit } from '@taquito/taquito';
import { InMemorySigner } from '@taquito/signer';
import { saveContractAddress } from '../scripts/helpers';
import { MichelsonMap } from '@taquito/michelson-encoder';
import {
  AggregatorFactoryCode,
  AggregatorFactoryContractAbstraction,
  IAggregatorFactoryStorage,
  IPair
} from '../aggregatorFactory';
import { alphaPercentPerThousand, decimals, heartBeatSeconds, oracleAddresses } from '../accounts';

export const AGGREGATOR_FACTORY_PAIRS: unique symbol = Symbol('AGGREGATOR_FACTORY_PAIRS');

export const AGGREGATOR_FACTORY_SMART_CONTRACT_ADDRESS: unique symbol = Symbol(
  'AGGREGATOR_FACTORY_SMART_CONTRACT_ADDRESS'
);

export interface IMigrationResult {
  [AGGREGATOR_FACTORY_PAIRS]: string;
  [AGGREGATOR_FACTORY_SMART_CONTRACT_ADDRESS]: string;
}

export default async function (
  networkConfig: INetworkConfig,
  networkName: NetworkName,
  saveToEnv: boolean = true
): Promise<IMigrationResult> {
  const toolkit = new TezosToolkit(networkConfig.networks[networkName].rpc);

  toolkit.setProvider({
    config: {
      confirmationPollingTimeoutSecond: networkConfig.confirmationPollingTimeoutSecond
    },
    signer: await InMemorySigner.fromSecretKey(networkConfig.networks[networkName].secretKey)
  });

  // AGGREGATOR FACTORY CONTRACT ORIGINATION
  const aggregatorFactoryStorage: IAggregatorFactoryStorage = MichelsonMap.fromLiteral({}) as MichelsonMap<
    { 0: string; 1: string },
    string
  >;
  console.log('Originating Aggregator factory');
  const opFactory: OriginationOperation = await toolkit.contract.originate({
    code: AggregatorFactoryCode,
    storage: aggregatorFactoryStorage
  });
  console.log(`Aggregator factory origination done at: ${opFactory.contractAddress}`);

  if (opFactory.contractAddress === undefined) {
    throw new Error('Factory smart contract address not received');
  }

  if (saveToEnv) {
    await saveContractAddress(
      AGGREGATOR_FACTORY_SMART_CONTRACT_ADDRESS.description as string,
      opFactory.contractAddress,
      networkName
    );
  }

  await opFactory.confirmation();

  // AGGREGATORS CONTRACT ORIGINATION

  const pairs: IPair[] = [
    { 0: 'USD', 1: 'BTC' },
    { 0: 'USD', 1: 'XTZ' }
  ];

  for (const pair of pairs) {
    const aggregatorFactory = await toolkit.contract.at<AggregatorFactoryContractAbstraction>(
      opFactory.contractAddress
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
    console.log(`Aggregator creation done for pair: ${pair[0]}/${pair[1]}`);
  }

  const pairsAsString: string = pairs.map((pair) => `${pair[0]}/${pair[1]}`).join(' ');

  if (saveToEnv) {
    await saveContractAddress(AGGREGATOR_FACTORY_PAIRS.description as string, pairsAsString, networkName);
  }
  return {
    [AGGREGATOR_FACTORY_PAIRS]: pairsAsString,
    [AGGREGATOR_FACTORY_SMART_CONTRACT_ADDRESS]: opFactory.contractAddress
  };
}
