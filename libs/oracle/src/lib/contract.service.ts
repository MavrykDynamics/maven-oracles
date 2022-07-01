import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MichelsonType, packDataBytes } from '@taquito/michel-codec';
import { InMemorySigner } from '@taquito/signer';
import { verifySignature } from '@taquito/utils';

import { OracleConfig } from './oracle.config.js';
import { MichelsonMap, TezosToolkit } from '@taquito/taquito';
import BigNumber from 'bignumber.js';
import { Schema } from '@taquito/michelson-encoder';
import { AggregatorStorage, oracleInformation } from '../types/aggregators';
import { IAttestedReport, ICompressedReport, IObservation, ISignature } from './reportgen.network.service.js';

interface IOracleInformations {
  oracleAddress: string;
  oraclePublicKey: string;
  oraclePeerId: string;
}

@Injectable()
export class ContractService implements OnModuleInit {
  private readonly _logger: Logger = new Logger(ContractService.name);
  private _tezos: TezosToolkit;
  private _oracleAddresses: MichelsonMap<string, oracleInformation>;

  public constructor(private readonly _config: OracleConfig) {
    const { rpcUrl } = this._config;
    this._tezos = new TezosToolkit(rpcUrl);
  }

  public async onModuleInit(): Promise<void> {
    this._logger.log('Hello from contract service');
    await this.updateOraclesAddressesMap(this._config.aggregatorAddress);
  }

  public async getFValue(): Promise<number> {
    // change the this._config.aggregatorAddress inside
    const oracleAddresses = await this.getOraclesAddresses(this._config.aggregatorAddress);
    return Math.floor((oracleAddresses.size - 1) / 3);
  }

  public async updateOraclesAddressesMap(aggregatorAddress: string): Promise<void> {
    const contractInstance = await this._tezos.contract.at(aggregatorAddress);
    const storage: AggregatorStorage = await contractInstance.storage();
    this._oracleAddresses = storage.oracleAddresses;
  }

  public async getOraclesAddressesBlockchain(
    aggregatorAddress: string
  ): Promise<MichelsonMap<string, oracleInformation>> {
    const contractInstance = await this._tezos.contract.at(aggregatorAddress);
    const storage: AggregatorStorage = await contractInstance.storage();
    const oracleAddresses = storage.oracleAddresses;
    return oracleAddresses;
  }

  public async getOraclesAddresses(
    aggregatorAddress: string
  ): Promise<MichelsonMap<string, oracleInformation>> {
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
    oraclePriceResponsesForPack: MichelsonMap<string, BigNumber>
  ): Promise<string> {
    const typeMap: MichelsonType = {
      prim: 'map',
      args: [{ prim: 'address' }, { prim: 'nat' }],
      annots: ['%oraclePriceResponsesForPack']
    };

    const params = oraclePriceResponsesForPack;
    const schema = new Schema(typeMap);
    const toPack = schema.Encode(params);
    const priceCodec = packDataBytes(toPack, typeMap);
    return priceCodec.bytes;
  }

  public async signOraclePriceResponses(
    oraclePriceResponsesForPack: MichelsonMap<string, BigNumber>,
    signer: InMemorySigner
  ): Promise<string> {
    const signature_observations = await signer.sign(
      await this.packObservations(oraclePriceResponsesForPack)
    );
    return signature_observations.sig;
  }

  public async signCompressedReport(observations: IObservation[], secretKey: string): Promise<string> {
    const signer = new InMemorySigner(secretKey);

    const oraclePriceResponsesForPack = new MichelsonMap<string, BigNumber>();
    for (const { oracle, price } of observations) {
      const infos = await this.getOracleInformationsFromPeerId(this._config.aggregatorAddress, oracle);
      if (!infos) {
        return '';
      }
      oraclePriceResponsesForPack.set(infos.oracleAddress, price);
    }
    return await this.signOraclePriceResponses(oraclePriceResponsesForPack, signer);
  }

  public async verifyReportSignature(report: ICompressedReport, signature: ISignature): Promise<boolean> {
    const oraclePriceResponsesForPack = new MichelsonMap<string, BigNumber>();
    for (const { oracle, price } of report.observations) {
      const infos = await this.getOracleInformationsFromPeerId(this._config.aggregatorAddress, oracle);
      if (!infos) {
        return false;
      }
      oraclePriceResponsesForPack.set(infos.oracleAddress, price);
    }
    const msg = await this.packObservations(oraclePriceResponsesForPack);
    const infos = await this.getOracleInformationsFromAddressOracle(
      this._config.aggregatorAddress,
      signature.oracle
    );
    if (!infos) {
      return false;
    }
    return verifySignature(msg, infos.oraclePublicKey, signature.signature);
  }

  public async verifyAttestedReport(attestedReport: IAttestedReport): Promise<boolean> {
    const oraclePriceResponsesForPack = new MichelsonMap<string, BigNumber>();
    for (const { oracle, price } of attestedReport.observations) {
      const infos = await this.getOracleInformationsFromPeerId(this._config.aggregatorAddress, oracle);
      if (!infos) {
        return false;
      }
      oraclePriceResponsesForPack.set(infos.oracleAddress, price);
    }
    const msg = await this.packObservations(oraclePriceResponsesForPack);

    const signaturesOk = await Promise.all(
      attestedReport.observations.map(async ({ oracle: peerId }) => {
        const address = await this.getOracleInformationsFromPeerId(this._config.aggregatorAddress, peerId);
        const result = attestedReport.signatures.find((element) => {
          return element.oracle === address?.oracleAddress;
        });
        if (!result) {
          this._logger.debug('!result');
          return false;
        }

        const infos = await this.getOracleInformationsFromAddressOracle(
          this._config.aggregatorAddress,
          result.oracle
        );
        if (!infos) {
          this._logger.debug('!infos');
          return false;
        }
        return verifySignature(msg, infos.oraclePublicKey, result.signature);
      })
    );

    this._logger.debug(`Signature verif array: ${JSON.stringify(signaturesOk)}`);

    return signaturesOk.every((ok) => ok);
  }

  // public async runVerify(): Promise<any> {
  //   const { aggregatorAddress } = this._config;

  //   const oracle1_signer = new InMemorySigner(accounts.alice.sk);
  //   const oracle2_signer = new InMemorySigner(accounts.bob.sk);

  //   const contractInstance = await this._tezos.contract.at(aggregatorAddress);

  //   const oracle1_price = new BigNumber(100);
  //   const oracle1_address = accounts.alice.pkh;
  //   const oracle2_price = new BigNumber(150);
  //   const oracle2_address = accounts.bob.pkh;

  //   const oracle1_signature = await this.signOracleObservation(oracle1_price,oracle1_address, oracle1_signer);
  //   const oracle2_signature = await this.signOracleObservation(oracle2_price,oracle2_address, oracle2_signer);

  //   const oraclePriceResponses = new MichelsonMap<string, OraclePriceResponsesValue>();
  //   oraclePriceResponses.set(oracle1_address, {
  //     oracleSignature: oracle1_signature,
  //     priceSalted: [oracle1_price, oracle1_address]
  //   });
  //   oraclePriceResponses.set(oracle2_address, {
  //     oracleSignature: oracle2_signature,
  //     priceSalted: [oracle2_price, oracle2_address]
  //   });

  //   const oraclePriceResponses_forPack = new MichelsonMap<string, OraclePriceResponsesForPackValue>();
  //   oraclePriceResponses_forPack.set(oracle1_address, {
  //     oracleSignature: oracle1_signature,
  //     oracleObservation_price: oracle1_price,
  //     oracleObservation_address: oracle1_address
  //   });
  //   oraclePriceResponses_forPack.set(oracle2_address, {
  //     oracleSignature: oracle2_signature,
  //     oracleObservation_price: oracle2_price,
  //     oracleObservation_address: oracle2_address
  //   });

  //   const oracle1_signature_observations = await this.signOraclePriceResponses(oraclePriceResponses_forPack, oracle1_signer);
  //   const oracle2_signature_observations = await this.signOraclePriceResponses(oraclePriceResponses_forPack, oracle2_signer);

  //   const signatures = new MichelsonMap<string, string>();
  //   signatures.set(oracle1_address, oracle1_signature_observations);
  //   signatures.set(oracle2_address, oracle2_signature_observations);

  //   const op = contractInstance.methodsObject.verify(
  //     {
  //       oraclePriceResponses,
  //       signatures
  //     }
  //   );

  //   this._tezos.setSignerProvider(oracle1_signer);
  //   const tx = await op.send();
  //   await tx.confirmation();

  //   const after_storage: AggregatorStorage = await contractInstance.storage();
  //   console.log(after_storage.lastPrice.toString())
  // }

  // public async signOracleObservation(price: BigNumber, address: string, signer: InMemorySigner): Promise<string> {
  //   const data: MichelsonData = {
  //     prim: 'Pair', args: [{ int: price.toString() }, { string: address }]

  //   };
  //   const type: MichelsonType = {
  //     prim: 'pair', args: [{ prim: 'nat' }, { prim: 'address' }]
  //   };
  //   const priceCodec = packDataBytes(data, type);
  //   const signature = await signer.sign(priceCodec.bytes);
  //   return signature.sig;
  // }
}
