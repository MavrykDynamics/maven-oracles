import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MichelsonType, packDataBytes } from '@taquito/michel-codec';
import { InMemorySigner } from '@taquito/signer';
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

@Injectable()
export class ContractService implements OnModuleInit {
  private readonly _logger: Logger = new Logger(ContractService.name);

  public constructor(
    private readonly _config: OracleConfig,
    private readonly _txManagerService: TxManagerService
  ) {}

  public async onModuleInit(): Promise<void> {}

  public async getAggregatorAddresses(aggregatorFactoryAddress: string): Promise<IAggregatorInformations[]> {
    const contractInstance = await (
      await this._txManagerService.getTezosToolkit()
    ).contract.at<AggregatorFactoryContractAbstraction>(aggregatorFactoryAddress);
    const storage = await contractInstance.storage();
    return [...storage.entries()].map(([pair, aggregatorAddress]) => {
      return {
        aggregatorAddress,
        pair: [pair['0'], pair['1']]
      } as IAggregatorInformations;
    });
  }

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

  public async signOraclePriceResponses(
    oraclePriceResponsesForPack: MichelsonMap<string, IOracleObservationType>,
    signer: InMemorySigner
  ): Promise<string> {
    const signature_observations = await signer.sign(
      await this._packObservations(oraclePriceResponsesForPack)
    );
    return signature_observations.sig;
  }

  public async signCompressedReport(
    aggregatorAddress: string,
    oracleAddresses: IOracleInformations[],
    observations: IObservation[],
    secretKey: string,
    epoch: number,
    round: number
  ): Promise<string> {
    const signer = new InMemorySigner(secretKey);
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
    return await this.signOraclePriceResponses(oraclePriceResponsesForPack, signer);
  }

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
   * @param aggregatorAddress - Address of the aggregator
   * @param attestedReport - Report with signatures
   * @param oracleAddresses - Informations about the oracles (pk, pkh and peer id)
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

    const op = contractInstance.methodsObject.verify({
      oracleObservations,
      signatures
    });

    try {
      this._logger.log(`Sending report ${report.epoch}/${report.round} sent to the blockchain!`);
      await this._txManagerService.addBatch([
        {
          ...op.toTransferParams(),
          kind: OpKind.TRANSACTION
        }
      ]);
      this._logger.log(`Sent ${report.epoch}/${report.round} sent to the blockchain!`);
    } catch (e) {
      this._logger.error(`Report not sent to the blockchain!`);
      this._logger.error(JSON.stringify(e));
    }
  }

  public async getLastBlockchainReport(aggregatorAddress: string): Promise<{
    epoch: number;
    round: number;
    price: BigNumber;
    time: number;
  }> {
    const contractInstance = await (
      await this._txManagerService.getTezosToolkit()
    ).contract.at(aggregatorAddress);
    const storage: IAggregatorStorage = await contractInstance.storage();

    return {
      epoch: storage.lastResult.epoch.toNumber(),
      round: storage.lastResult.round.toNumber(),
      price: storage.lastResult.price,
      time: toTimestamp(storage.lastResult.time)
    };
  }

  public async getAggregatorConfig(aggregatorAddress: string): Promise<IAggregatorConfig> {
    const contractInstance = await (
      await this._txManagerService.getTezosToolkit()
    ).contract.at(aggregatorAddress);
    const storage: IAggregatorStorage = await contractInstance.storage();
    return {
      heartBeatSeconds: storage.heartBeatSeconds,
      decimals: storage.decimals,
      alphaPercentPerThousand: storage.alphaPercentPerThousand.div(1000)
    };
  }
}
