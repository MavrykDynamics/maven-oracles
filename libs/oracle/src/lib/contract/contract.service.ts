import { Injectable, OnModuleInit } from '@nestjs/common';
import { MichelsonType, packDataBytes } from '@taquito/michel-codec';
import { verifySignature } from '@taquito/utils';

import { OracleConfig } from '../oracle.config.js';
import { MichelsonMap, OpKind } from '@taquito/taquito';
import BigNumber from 'bignumber.js';
import { Schema } from '@taquito/michelson-encoder';
import { IAttestedReport, ICompressedReport, IObservation, ISignature } from '../reportgen';
import { toTimestamp } from './helpers.js';
import { TxManagerService } from '@tezosdynamics/tx-manager';
import {
  AggregatorFactoryContractAbstraction,
  IAggregatorInformations,
  IAggregatorStorage,
  IOracleInformations,
  IOracleObservationType
} from '@tezosdynamics/contracts';
import { IAggregatorConfig } from './contract.types.js';
import { getLogger } from '../logger.js';
import { Logger } from 'winston';

/**
 * Contract service
 *
 * Provide an abstraction of the contract capabilities to the other services.
 */
@Injectable()
export class ContractService implements OnModuleInit {
  private readonly _logger: Logger = getLogger({
    defaultMeta: {
      service: ContractService.name
    }
  });

  public constructor(
    private readonly _config: OracleConfig,
    private readonly _txManagerService: TxManagerService
  ) {}

  public async onModuleInit(): Promise<void> {}

  /**
   * Fetch aggregators registered in the aggregator factory
   *
   * @param aggregatorFactoryAddress - Address of the aggregator factory smart contract to fetch from
   */
  public async getAggregatorAddresses(aggregatorFactoryAddress: string): Promise<IAggregatorInformations[]> {
    const contractInstance = await (
      await this._txManagerService.getTezosToolkit()
    ).contract.at<AggregatorFactoryContractAbstraction>(aggregatorFactoryAddress);
    const storage = await contractInstance.storage();
    return [...storage.trackedAggregators.entries()].map(([pair, aggregatorAddress]) => {
      return {
        aggregatorAddress,
        pair: [pair['0'], pair['1']]
      } as IAggregatorInformations;
    });
  }

  /**
   * Fetch oracle addresses listed in an aggregator
   *
   * @param aggregatorAddress - Address of the aggregator smart contract to fetch from
   */
  public async getOraclesAddresses(aggregatorAddress: string): Promise<IOracleInformations[]> {
    const contractInstance = await (
      await this._txManagerService.getTezosToolkit()
    ).contract.at(aggregatorAddress);
    const storage: IAggregatorStorage = await contractInstance.storage();

    return [...storage.oracleAddresses.entries()].map(([oracleAddress, val]) => ({
      ...val,
      oracleAddress
    }));
  }

  /**
   * Serialize report into Tezos format
   * @param aggregatorAddress - Aggregator smart contract address
   * @param oracleAddresses - Information about the oracles (pk, pkh and peer id)
   * @param report - Report to pack
   *
   * @returns - Packed report
   *
   * @private
   */
  private async _packReport(
    aggregatorAddress: string,
    oracleAddresses: IOracleInformations[],
    report: IAttestedReport
  ): Promise<string> {
    const oraclePriceResponsesForPack = new MichelsonMap<string, IOracleObservationType>();

    for (const { oracle, price } of report.observations) {
      const infos = oracleAddresses.find((addrs) => addrs.oraclePeerId === oracle);
      if (!infos) {
        throw new Error(`Cannot pack report, missing oracle address for oracle ${oracle}`);
      }
      oraclePriceResponsesForPack.set(infos.oracleAddress, {
        price,
        epoch: report.epoch,
        round: report.round,
        aggregatorAddress
      });
    }
    return await this._packObservations(oraclePriceResponsesForPack);
  }

  /**
   * Serialize observations into Tezos format
   * @param oraclePriceResponsesForPack - Observations to pack
   *
   * @returns - Packed observation
   *
   * @private
   */
  private async _packObservations(
    oraclePriceResponsesForPack: MichelsonMap<string, IOracleObservationType>
  ): Promise<string> {
    const typeMap: MichelsonType = {
      prim: 'map',
      args: [
        { prim: 'address' },
        {
          prim: 'pair',
          args: [
            { prim: 'nat', annots: ['%price'] },
            {
              prim: 'pair',
              args: [
                { prim: 'nat', annots: ['%epoch'] },
                {
                  prim: 'pair',
                  args: [
                    { prim: 'nat', annots: ['%round'] },
                    { prim: 'address', annots: ['%aggregatorAddress'] }
                  ]
                }
              ]
            }
          ]
        }
      ],
      annots: ['%oraclePriceResponsesForPack']
    };

    const params = oraclePriceResponsesForPack;
    const schema = new Schema(typeMap);
    const toPack = schema.Encode(params);
    const priceCodec = packDataBytes(toPack, typeMap);
    return priceCodec.bytes;
  }

  /**
   * Sign oracle prices using Tezos signer key
   *
   * @param oraclePriceResponsesForPack - Observation map
   *
   * @returns - Signature
   */
  public async signOraclePriceResponses(
    oraclePriceResponsesForPack: MichelsonMap<string, IOracleObservationType>
  ): Promise<string> {
    const toolkit = await this._txManagerService.getTezosToolkit();
    const signature_observations = await toolkit.signer.sign(
      `0x${await this._packObservations(oraclePriceResponsesForPack)}`
    );
    return signature_observations.sig;
  }

  /**
   * Sign compressed report using Tezos signer key
   *
   * @param aggregatorAddress - Aggregator smart contract address
   * @param oracleAddresses - Information about the oracles (pk, pkh and peer id)
   * @param observations - Oracles observations
   * @param epoch - Report epoch
   * @param round - Report round
   *
   * @returns - Signature
   */
  public async signCompressedReport(
    aggregatorAddress: string,
    oracleAddresses: IOracleInformations[],
    observations: IObservation[],
    epoch: number,
    round: number
  ): Promise<string> {
    const oraclePriceResponsesForPack = new MichelsonMap<string, IOracleObservationType>();

    for (const { oracle, price } of observations) {
      const infos = oracleAddresses.find((addrs) => addrs.oraclePeerId === oracle);
      if (!infos) {
        return '';
      }
      oraclePriceResponsesForPack.set(infos.oracleAddress, {
        price,
        epoch,
        round,
        aggregatorAddress
      });
    }
    return await this.signOraclePriceResponses(oraclePriceResponsesForPack);
  }

  /**
   * Check if report is correctly signed
   *
   * @param aggregatorAddress - Aggregator smart contract address
   * @param oracleAddresses - Information about the oracles (pk, pkh and peer id)
   * @param report - Report
   * @param signature - Signature to check
   *
   * @returns boolean
   */
  public async verifyReportSignature(
    aggregatorAddress: string,
    oracleAddresses: IOracleInformations[],
    report: ICompressedReport,
    signature: ISignature
  ): Promise<boolean> {
    const oraclePriceResponsesForPack = new MichelsonMap<string, IOracleObservationType>();

    for (const { oracle, price } of report.observations) {
      const infos = oracleAddresses.find((addrs) => addrs.oraclePeerId === oracle);
      if (!infos) {
        return false;
      }
      oraclePriceResponsesForPack.set(infos.oracleAddress, {
        price,
        epoch: report.epoch,
        round: report.round,
        aggregatorAddress
      });
    }
    const packedReport = await this._packObservations(oraclePriceResponsesForPack);
    const infos = oracleAddresses.find((addrs) => addrs.oracleAddress === signature.oracle);
    if (!infos) {
      return false;
    }
    return verifySignature(packedReport, infos.oraclePublicKey, signature.signature);
  }

  /**
   * Verify that the report contains as least f signatures
   *
   * @param aggregatorAddress - Aggregator smart contract address
   * @param attestedReport - Report with signatures
   * @param oracleAddresses - Information about the oracles (pk, pkh and peer id)
   * @param f - Minimum number of trusted oracles
   * @returns if the report has enough signatures
   */
  public async verifyAttestedReport(
    aggregatorAddress: string,
    attestedReport: IAttestedReport,
    oracleAddresses: IOracleInformations[],
    f: number
  ): Promise<boolean> {
    const packedReport = await this._packReport(aggregatorAddress, oracleAddresses, attestedReport);

    const signaturesOk = await Promise.all(
      attestedReport.signatures.map(async ({ oracle: pkh, signature }) => {
        const address = oracleAddresses.find((addr) => addr.oracleAddress === pkh);

        if (!address) {
          this._logger.warn(`Cannot retrieve oraclePublicKey for ${pkh}`);
          return false;
        }

        return verifySignature(packedReport, address.oraclePublicKey, signature);
      })
    );

    return signaturesOk.every((ok) => ok) && signaturesOk.length > f;
  }

  /**
   * Send a report to the aggregator smart contract
   *
   * @param aggregatorAddress - Aggregator smart contract address
   * @param oracleAddresses - Information about the oracles (pk, pkh and peer id)
   * @param report - Report to send
   */
  public async sendReportBlockchain(
    aggregatorAddress: string,
    oracleAddresses: IOracleInformations[],
    report: IAttestedReport
  ): Promise<void> {
    const contractInstance = await (
      await this._txManagerService.getTezosToolkit()
    ).contract.at(aggregatorAddress);

    const signatures = new MichelsonMap<string, string>();
    report.signatures.forEach((signature) => {
      signatures.set(signature.oracle, signature.signature);
    });

    const oracleObservations = new MichelsonMap<string, IOracleObservationType>();

    for (const { oracle, price } of report.observations) {
      const infos = oracleAddresses.find((addrs) => addrs.oraclePeerId === oracle);
      if (infos) {
        oracleObservations.set(infos.oracleAddress, {
          price,
          epoch: report.epoch,
          round: report.round,
          aggregatorAddress
        });
      }
    }

    const op = contractInstance.methodsObject.updateData({
      oracleObservations,
      signatures
    });

    try {
      this._logger.info(`Sending report ${report.epoch}/${report.round} sent to the blockchain!`);
      const response = await this._txManagerService.addBatch([
        {
          ...op.toTransferParams(),
          kind: OpKind.TRANSACTION
        }
      ]);
      if (response.type === 'success') {
        this._logger.info(
          `${aggregatorAddress}/${report.epoch}/${report.round} - Report sent to the blockchain (op hash: ${response.response.opHash})!`
        );
        return;
      }

      if (response.type === 'error') {
        this._logger.error(
          `${aggregatorAddress}/${report.epoch}/${
            report.round
          } - Error while sending tx to the aggregator: ${JSON.stringify(response.error)}`
        );
        return;
      }
    } catch (e) {
      this._logger.error(
        `${aggregatorAddress}/${report.epoch}/${
          report.round
        } - Error while sending tx to the aggregator: ${JSON.stringify(e)}`
      );
    }
  }

  /**
   * Fetch the last blockchain report from the aggregator smart contract
   * @param aggregatorAddress - Aggregator smart contract address
   *
   * @returns - Should always return a value if the aggregator exists (and is a valid aggregator)
   * since the smart contract storage is initialized with zero values
   */
  public async getLastBlockchainReport(aggregatorAddress: string): Promise<{
    epoch: number;
    round: number;
    price: BigNumber;
    time: number;
  } | null> {
    const contractInstance = await (
      await this._txManagerService.getTezosToolkit()
    ).contract.at(aggregatorAddress);
    const storage: IAggregatorStorage = await contractInstance.storage();

    return {
      epoch: storage.lastCompletedPrice.epoch.toNumber(),
      round: storage.lastCompletedPrice.round.toNumber(),
      price: storage.lastCompletedPrice.price,
      time: toTimestamp(storage.lastCompletedPrice.time)
    };
  }

  /**
   * Fetch aggregator configuration from the smart contract
   *
   * @param aggregatorAddress - Aggregator smart contract address
   */
  public async getAggregatorConfig(aggregatorAddress: string): Promise<IAggregatorConfig> {
    const contractInstance = await (
      await this._txManagerService.getTezosToolkit()
    ).contract.at(aggregatorAddress);
    const storage: IAggregatorStorage = await contractInstance.storage();
    return {
      heartBeatSeconds: storage.config.heartBeatSeconds,
      decimals: storage.config.decimals,
      alphaPercentPerThousand: storage.config.alphaPercentPerThousand.div(1000)
    };
  }
}
