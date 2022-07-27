import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MichelsonType, packDataBytes } from '@taquito/michel-codec';
import { InMemorySigner } from '@taquito/signer';
import { verifySignature } from '@taquito/utils';

import { OracleConfig } from './oracle.config.js';
import { MichelsonMap, TezosToolkit } from '@taquito/taquito';
import BigNumber from 'bignumber.js';
import { Schema } from '@taquito/michelson-encoder';
import { IAggregatorStorage, IOracleInformation, IOracleInformations, IOracleObservationType } from '../types/aggregators';
import {
  IAttestedReport,
  ICompressedReport,
  IObservation,
  ISignature
} from './reportgen/reportgen.network.service.js';
import { toTimestamp } from './helpers.js';
import { IAggregatorFactoryStorage } from 'src/types/aggregatorFactory.js';

@Injectable()
export class ContractService implements OnModuleInit {
  private readonly _logger: Logger = new Logger(ContractService.name);
  private _tezos: TezosToolkit;
  private _oracleAddresses: MichelsonMap<string, IOracleInformation>;

  public constructor(private readonly _config: OracleConfig) {
    const { rpcUrl } = this._config;
    this._tezos = new TezosToolkit(rpcUrl);
  }

  public async onModuleInit(): Promise<void> {}

  public async getFValue(aggregatorAddress: string): Promise<number> {
    // change the aggregatorAddress inside
    const oracleAddresses = await this.getOraclesAddresses(aggregatorAddress);
    return Math.floor((oracleAddresses.size - 1) / 3);
  }

  public async updateOraclesAddressesMap(aggregatorAddress: string): Promise<void> {
    const contractInstance = await this._tezos.contract.at(aggregatorAddress);
    const storage: IAggregatorStorage = await contractInstance.storage();
    this._oracleAddresses = storage.oracleAddresses;
  }

  public async getAggregatorFromFactory(aggregatorFactoryAddress: string): Promise<IAggregatorFactoryStorage> {
    const contractInstance = await this._tezos.contract.at(aggregatorFactoryAddress);
    const storage: IAggregatorFactoryStorage = await contractInstance.storage();
    return storage;
  }

  public async getOraclesAddressesBlockchain(
    aggregatorAddress: string
  ): Promise<MichelsonMap<string, IOracleInformation>> {
    const contractInstance = await this._tezos.contract.at(aggregatorAddress);
    const storage: IAggregatorStorage = await contractInstance.storage();
    const oracleAddresses = storage.oracleAddresses;
    return oracleAddresses;
  }

  public async getOraclesAddresses(
    aggregatorAddress: string
  ): Promise<MichelsonMap<string, IOracleInformation>> {
    if (this._oracleAddresses) {
      return this._oracleAddresses;
    } else {
      return await this.getOraclesAddressesBlockchain(aggregatorAddress);
    }
  }

  public async isOracleAddressAuthorized(aggregatorAddress: string, oracleAddress: string): Promise<boolean> {
    const oracleAddresses = await this.getOraclesAddresses(aggregatorAddress);
    return oracleAddresses.has(oracleAddress);
  }

  public async getOracleInformationsFromAddressOracle(
    aggregatorAddress: string,
    oracleAddress: string
  ): Promise<IOracleInformations | undefined> {
    const oracleAddresses = await this.getOraclesAddresses(aggregatorAddress);
    const infos = oracleAddresses.get(oracleAddress);
    return infos
      ? {
          oracleAddress,
          ...infos
        }
      : undefined;
  }

  public async getOracleInformationsFromPeerId(
    aggregatorAddress: string,
    peerId: string
  ): Promise<IOracleInformations | undefined> {
    const oracleAddresses = await this.getOraclesAddresses(aggregatorAddress);
    let oracleAddress = '';
    for (const [key, value] of oracleAddresses.entries()) {
      if (value.oraclePeerId === peerId) {
        oracleAddress = key;
      }
    }
    if (oracleAddress === '') {
      return undefined;
    }
    const infos = oracleAddresses.get(oracleAddress);
    return infos
      ? {
          oracleAddress,
          ...infos
        }
      : undefined;
  }

  public async packObservations(
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
      await this.packObservations(oraclePriceResponsesForPack)
    );
    return signature_observations.sig;
  }

  public async signCompressedReport(
    aggregatorAddress: string,
    observations: IObservation[],
    secretKey: string,
    epoch: number,
    round: number
  ): Promise<string> {
    const signer = new InMemorySigner(secretKey);
    const oraclePriceResponsesForPack = new MichelsonMap<string, IOracleObservationType>();
    observations.sort((a, b) => a.oracle.localeCompare(b.oracle));

    for (const { oracle, price } of observations) {
      const infos = await this.getOracleInformationsFromPeerId(aggregatorAddress, oracle);
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
    report: ICompressedReport,
    signature: ISignature
  ): Promise<boolean> {
    const oraclePriceResponsesForPack = new MichelsonMap<string, IOracleObservationType>();
    report.observations.sort((a, b) => a.oracle.localeCompare(b.oracle));
    for (const { oracle, price } of report.observations) {
      const infos = await this.getOracleInformationsFromPeerId(aggregatorAddress, oracle);
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
    const msg = await this.packObservations(oraclePriceResponsesForPack);
    const infos = await this.getOracleInformationsFromAddressOracle(aggregatorAddress, signature.oracle);
    if (!infos) {
      return false;
    }
    return verifySignature(msg, infos.oraclePublicKey, signature.signature);
  }

  public async verifyAttestedReport(
    aggregatorAddress: string,
    attestedReport: IAttestedReport
  ): Promise<boolean> {
    const oraclePriceResponsesForPack = new MichelsonMap<string, IOracleObservationType>();
    for (const { oracle, price } of attestedReport.observations) {
      const infos = await this.getOracleInformationsFromPeerId(aggregatorAddress, oracle);
      if (!infos) {
        return false;
      }
      oraclePriceResponsesForPack.set(infos.oracleAddress, {
        price,
        epoch: attestedReport.epoch,
        round: attestedReport.round,
        aggregatorAddress
      });
    }
    const msg = await this.packObservations(oraclePriceResponsesForPack);

    const signaturesOk = await Promise.all(
      attestedReport.observations.map(async ({ oracle: peerId }) => {
        const address = await this.getOracleInformationsFromPeerId(aggregatorAddress, peerId);
        const result = attestedReport.signatures.find((element) => {
          return element.oracle === address?.oracleAddress;
        });
        if (!result) {
          this._logger.debug('!result');
          return false;
        }

        const infos = await this.getOracleInformationsFromAddressOracle(aggregatorAddress, result.oracle);
        if (!infos) {
          this._logger.debug('!infos');
          return false;
        }
        return verifySignature(msg, infos.oraclePublicKey, result.signature);
      })
    );

    return signaturesOk.every((ok) => ok);
  }

  public async sendReportBlockchain(aggregatorAddress: string, report: IAttestedReport): Promise<void> {
    const oracleSigner = new InMemorySigner(this._config.tezosSecretKey);
    const contractInstance = await this._tezos.contract.at(aggregatorAddress);

    const signatures = new MichelsonMap<string, string>();
    report.signatures.forEach((signature) => {
      signatures.set(signature.oracle, signature.signature);
    });

    const oracleObservations = new MichelsonMap<string, IOracleObservationType>();
    report.observations.sort((a, b) => a.oracle.localeCompare(b.oracle));

    for (const { oracle, price } of report.observations) {
      const infos = await this.getOracleInformationsFromPeerId(aggregatorAddress, oracle);
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

    this._tezos.setSignerProvider(oracleSigner);

    try {
      const tx = await op.send();
      await tx.confirmation();
      this._logger.log(`Report ${report.epoch}/${report.round} sent to the blockchain!`);
    } catch (e) {
      this._logger.error(`Report NOT send to the blockchain!`);
      this._logger.debug(`Tezos Error: ${JSON.stringify(e)}`);
    }
  }

  public async _getLastBlockchainReport(aggregatorAddress: string): Promise<{
    epoch: number;
    round: number;
    price: BigNumber;
    time: number;
  }> {
    const contractInstance = await this._tezos.contract.at(aggregatorAddress);
    const storage: IAggregatorStorage = await contractInstance.storage();

    return {
      epoch: storage.lastResult.epoch.toNumber(),
      round: storage.lastResult.round.toNumber(),
      price: storage.lastResult.price,
      time: toTimestamp(storage.lastResult.time)
    };
  }

  public async _getBlockchainConfig(aggregatorAddress: string): Promise<{
    heartBeatSeconds: number;
    decimals: BigNumber;
    alphaPercentPerThousand: BigNumber;
  }> {
    const contractInstance = await this._tezos.contract.at(aggregatorAddress);
    const storage: IAggregatorStorage = await contractInstance.storage();
    return {
      heartBeatSeconds: storage.heartBeatSeconds?.toNumber() || 60,
      decimals: storage.decimals,
      alphaPercentPerThousand: storage.alphaPercentPerThousand.div(1000)
    };
  }

  // public async runVerify(): Promise<any> {
  //   const { aggregatorAddress } = this._config;

  //   const oracle1_signer = new InMemorySigner(accounts[0].sk);
  //   const oracle2_signer = new InMemorySigner(accounts[1].sk);
  //   const contractInstance = await this._tezos.contract.at(aggregatorAddress);
  //   const oracle1_price = new BigNumber(200);
  //   const oracle1_address = accounts[0].pkh;
  //   const oracle2_price = new BigNumber(150);
  //   const oracle2_address = accounts[1].pkh;

  //   const observations = [{
  //     oracle: oracle1_address,
  //     price: oracle1_price
  //   },{
  //     oracle: oracle2_address,
  //     price: oracle2_price
  //   }]
  //   const oraclePriceResponsesForPack = new MichelsonMap<string, IOracleObservationType>();
  //   observations.sort((a, b) => a.oracle.localeCompare(b.oracle))
  //   const round = 1;
  //   const epoch= 1;
  //   for (const { oracle, price } of observations) {
  //     oraclePriceResponsesForPack.set(oracle, {
  //       price,
  //       epoch,
  //       round
  //     });
  //   }

  //   const signature1 = await this.signOraclePriceResponses(oraclePriceResponsesForPack, oracle1_signer);
  //   const signature2 = await this.signOraclePriceResponses(oraclePriceResponsesForPack, oracle2_signer);
  //   const signatureList = [{
  //     oracle: oracle1_address,
  //     signature: signature1
  //   },{
  //     oracle: oracle2_address,
  //     signature: signature2
  //   }];

  //   const oracleObservations = new MichelsonMap<string, IOracleObservationType>();
  //   observations.sort((a, b) => a.oracle.localeCompare(b.oracle))
  //   for (const { oracle, price } of observations) {
  //     oracleObservations.set(oracle, {
  //       price, epoch, round});
  //   };

  //   const signatures = new MichelsonMap<string, string>();
  //   signatureList.forEach((signature_) => {
  //     signatures.set(signature_.oracle, signature_.signature);
  //   });

  //   const op = contractInstance.methodsObject.verify(
  //     {
  //       oracleObservations,
  //       signatures
  //     }
  //   );

  //   this._tezos.setSignerProvider(oracle1_signer);
  //   const tx = await op.send();
  //   await tx.confirmation();

  //   const after_storage: AggregatorStorage = await contractInstance.storage();
  // }
}
