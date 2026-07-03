/* eslint-disable @typescript-eslint/naming-convention */
import { INetworkConfig, NetworkName } from '../scripts/env';
import { OriginationOperation, TezosToolkit } from '@mavrykdynamics/taquito';
import { InMemorySigner } from '@mavrykdynamics/taquito-signer';
import BigNumber from 'bignumber.js';
import { saveContractAddress, setAggregatorFactoryLambdas, setAggregatorFactoryProductLambdas, setMavenLiteGeneralContracts } from '../scripts/helpers.js';
import { MichelsonMap } from '@mavrykdynamics/taquito-michelson-encoder';
import {
    AggregatorFactoryCode,
    AggregatorFactoryContractAbstraction,
    IAggregatorFactoryStorage
} from '../aggregatorFactory.js';
import {
    MavenLiteCode,
    MavenLiteContractAbstraction,
    IMavenLiteStorage
} from '../mavenLite.js';
import { alphaPercentPerThousand, percentOracleThreshold, rewardAmountStakedMvn, rewardAmountXtz, decimals, heartbeatSeconds, oracleLedger, satelliteLedger, accounts } from '../accounts.js';

export const AGGREGATOR_SMART_CONTRACT_ADDRESSES: unique symbol = Symbol(
    'AGGREGATOR_SMART_CONTRACT_ADDRESSES'
);

export interface IMigrationResult {
    [AGGREGATOR_SMART_CONTRACT_ADDRESSES]: string;
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

    // MAVEN LITE CONTRACT ORIGINATION
    const mavenLiteConfig = {
        minimumStakedMvnBalance             : new BigNumber(10000000000),
        delegationRatio                     : new BigNumber(1000),
        maxSatellites                       : new BigNumber(100),
        satelliteNameMaxLength              : new BigNumber(400),
        satelliteDescriptionMaxLength       : new BigNumber(1000),
        satelliteImageMaxLength             : new BigNumber(400),
        satelliteWebsiteMaxLength           : new BigNumber(400),
    }
    const mavenLiteStorage: IMavenLiteStorage = {
        config                  : mavenLiteConfig,
        generalContracts        : MichelsonMap.fromLiteral({}),
        satelliteLedger         : satelliteLedger
    };
    console.log('Originating Maven Lite');
    const opMavenLite: OriginationOperation = await toolkit.contract.originate({
        code: MavenLiteCode,
        storage: mavenLiteStorage
    });
    console.log(`Maven Lite origination done at: ${opMavenLite.contractAddress}`);

    if (opMavenLite.contractAddress === undefined) {
        throw new Error('Maven Lite smart contract address not received');
    }

    await opMavenLite.confirmation();

    console.log(`Maven Lite origination confirmed`);

    // SET GENERAL CONTRACTS
    const mavenLite = await toolkit.contract.at<MavenLiteContractAbstraction>(
        opMavenLite.contractAddress
    );
    await setMavenLiteGeneralContracts(toolkit, mavenLite);

    console.log(`Maven Lite general contracts set`);

    // AGGREGATOR FACTORY CONTRACT ORIGINATION
    const aggregatorConfig = {
        aggregatorNameMaxLength        : new BigNumber(200),
    }
    const breakGlassConfig = {
        createAggregatorIsPaused              : false,
        trackAggregatorIsPaused               : false,
        untrackAggregatorIsPaused             : false,
        distributeRewardXtzIsPaused           : false,
        distributeRewardStakedMvnIsPaused     : false,
    }
    const aggregatorFactoryMetadata = MichelsonMap.fromLiteral({
        '': Buffer.from('tezos-storage:data', 'ascii').toString('hex'),
        data: Buffer.from(
            JSON.stringify({
            name: 'MAVEN Aggregator Factory Contract',
            version: 'v1.0.0',
            authors: ['MAVEN Dev Team <contact@mavenfinance.io>'],
            }),
            'ascii',
        ).toString('hex'),
    })
    const aggregatorFactoryStorage: IAggregatorFactoryStorage = {
        admin                   : accounts.alice.pkh,
        metadata                : aggregatorFactoryMetadata,
        config                  : aggregatorConfig,

        mvnTokenAddress         : opMavenLite.contractAddress,
        governanceAddress       : opMavenLite.contractAddress,

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
        storage: aggregatorFactoryStorage
    });
    console.log(`Aggregator factory origination done at: ${opFactory.contractAddress}`);

    if (opFactory.contractAddress === undefined) {
        throw new Error('Factory smart contract address not received');
    }

    await opFactory.confirmation();

    console.log(`Aggregator factory origination confirmed`);

    // AGGREGATOR LAMBDAS SETUP
    const aggregatorFactory = await toolkit.contract.at<AggregatorFactoryContractAbstraction>(
        opFactory.contractAddress
    );
    await setAggregatorFactoryLambdas(toolkit, aggregatorFactory);
    await setAggregatorFactoryProductLambdas(toolkit, aggregatorFactory);

    console.log(`Aggregator factory lambdas set`);

    // AGGREGATORS CONTRACT ORIGINATION
    const aggregatorMetadata = Buffer.from(
            JSON.stringify({
            name: 'MAVEN Aggregator Contract',
            version: 'v1.0.0',
            authors: ['MAVEN Dev Team <contact@mavenfinance.io>'],
            }),
            'ascii',
        ).toString('hex')

    const createAggregatorOperation = await aggregatorFactory.methods.createAggregator(
        'BTC/USD',
        false,
        oracleLedger,
        decimals,
        alphaPercentPerThousand,
        percentOracleThreshold,
        heartbeatSeconds,
        rewardAmountStakedMvn,
        rewardAmountXtz,
        aggregatorMetadata
    ).send();

    await createAggregatorOperation.confirmation();
    console.log(`Aggregator creation done for pair: USD/BTC`);

    const contractStorage           = await aggregatorFactory.storage();
    const aggregatorAddress: string = contractStorage.trackedAggregators[0]

    if (saveToEnv) {
        await saveContractAddress(
            AGGREGATOR_SMART_CONTRACT_ADDRESSES.description as string,
            aggregatorAddress,
            networkName
        );
    }

    return {
        [AGGREGATOR_SMART_CONTRACT_ADDRESSES]: aggregatorAddress
    };
}
