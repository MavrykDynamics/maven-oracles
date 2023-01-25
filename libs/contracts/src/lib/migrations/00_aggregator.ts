/* eslint-disable @typescript-eslint/naming-convention */
import { INetworkConfig, NetworkName } from '../scripts/env';
import { OriginationOperation, TezosToolkit } from '@taquito/taquito';
import { InMemorySigner } from '@taquito/signer';
import BigNumber from 'bignumber.js';
import { saveContractAddress } from '../scripts/helpers.js';
import { MichelsonMap } from '@taquito/michelson-encoder';
import {
  AggregatorFactoryCode,
  AggregatorFactoryContractAbstraction,
  IAggregatorFactoryStorage
} from '../aggregatorFactory.js';
import { alphaPercentPerThousand, percentOracleThreshold, rewardAmountStakedMvk, rewardAmountXtz, decimals, heartBeatSeconds, oracleAddresses, accounts, zeroAddress } from '../accounts.js';

export const AGGREGATOR_FACTORY_SMART_CONTRACT_ADDRESS: unique symbol = Symbol(
  'AGGREGATOR_FACTORY_SMART_CONTRACT_ADDRESS'
);

export interface IMigrationResult {
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
  const config = {
    aggregatorNameMaxLength        : new BigNumber(200),
  }
  const breakGlassConfig = {
    createAggregatorIsPaused              : false,
    trackAggregatorIsPaused               : false,
    untrackAggregatorIsPaused             : false,
    distributeRewardXtzIsPaused           : false,
    distributeRewardStakedMvkIsPaused     : false,
  }
  const aggregatorFactoryMetadata = MichelsonMap.fromLiteral({
    '': Buffer.from('tezos-storage:data', 'ascii').toString('hex'),
    data: Buffer.from(
        JSON.stringify({
        name: 'MAVRYK Aggregator Factory Contract',
        version: 'v1.0.0',
        authors: ['MAVRYK Dev Team <contact@mavryk.finance>'],
        }),
        'ascii',
    ).toString('hex'),
  })
  const aggregatorFactoryStorage: IAggregatorFactoryStorage = {
    admin                   : accounts.alice.pkh,
    metadata                : aggregatorFactoryMetadata,
    config                  : config,

    mvkTokenAddress         : zeroAddress,
    governanceAddress       : zeroAddress,

    generalContracts        : MichelsonMap.fromLiteral({}),
    whitelistContracts      : MichelsonMap.fromLiteral({}),

    breakGlassConfig        : breakGlassConfig,
        
    trackedAggregators      : [],
    
    lambdaLedger            : MichelsonMap.fromLiteral({}),
    aggregatorLambdaLedger  : MichelsonMap.fromLiteral({}),
  };
  console.log('Originating Aggregator factory');
  const opFactory: OriginationOperation = await toolkit.contract.originate({
    code: AggregatorFactoryCode,
    storage: aggregatorFactoryStorage.trackedAggregators
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

  console.log(`Aggregator factory origination confirmed`);

  // AGGREGATORS CONTRACT ORIGINATION
  const aggregatorFactory = await toolkit.contract.at<AggregatorFactoryContractAbstraction>(
    opFactory.contractAddress
  );
  const aggregatorMetadata = MichelsonMap.fromLiteral({
      '': Buffer.from('tezos-storage:data', 'ascii').toString('hex'),
      data: Buffer.from(
          JSON.stringify({
          name: 'MAVRYK Aggregator Contract',
          version: 'v1.0.0',
          authors: ['MAVRYK Dev Team <contact@mavryk.finance>'],
          }),
          'ascii',
      ).toString('hex'),
  })

  const createAggregator1Op = await aggregatorFactory.methods
    .createAggregator(
      "USD/BTC",
      false,
      oracleAddresses,
      decimals,
      alphaPercentPerThousand,
      percentOracleThreshold,
      heartBeatSeconds,
      rewardAmountStakedMvk,
      rewardAmountXtz,
      aggregatorMetadata
    )
    .send();

  await createAggregator1Op.confirmation();
  console.log(`Aggregator creation done for pair: USD/BTC`);

  return {
    [AGGREGATOR_FACTORY_SMART_CONTRACT_ADDRESS]: opFactory.contractAddress
  };
}
