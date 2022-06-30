import {Injectable, Logger, OnModuleInit} from '@nestjs/common';
import {HttpService} from '@nestjs/axios';
import { packDataBytes, MichelsonData, MichelsonType } from '@taquito/michel-codec';
import { InMemorySigner } from '@taquito/signer';
import { verifySignature } from '@taquito/utils';
import { accounts } from './helpers.js';

import {OracleConfig} from "./oracle.config.js";
import { MichelsonMap, TezosToolkit } from '@taquito/taquito';
import BigNumber from 'bignumber.js';
import { Schema } from '@taquito/michelson-encoder';
import { AggregatorStorage, OraclePriceResponsesForPackValue, OraclePriceResponsesValue } from '../types/aggregators';
import { IAttestedReport, ICompressedReport, IObservation, ISignature } from './reportgen.network.service.js';

@Injectable()
export class ContractService implements OnModuleInit {
  private readonly _logger: Logger = new Logger(ContractService.name);
  private _tezos: TezosToolkit;

  public readonly _bigArray: any = [
    { peerId: '12D3KooWJQWBQvefFGj3uAzKGhpZYWYGKtj2fNQAG47aov4uj9p1', publicKey: 'edpkv9DgHWm6HY6b35Mv77hgZcWrJVD4ADebp9RjYxXVmFvGs4VYi1', address: 'tz1eAoFgsys8PhTUvT3V3eq2BFaZp8UsGNsr' },
    { peerId: '12D3KooWBpgAXhUAgjPAwEk5FJ9DRB2kFbuj8KLkPPmqKKmzrXz2', publicKey: 'edpkunKYLbEfRLKLtn9yi9avyjQbAAbQxuPVN759ajQEDKpp4RE6GV', address: 'tz1MBNfBnNn8fZCJVrrXV95FSgyuUxbmt3Mm' },
    { peerId: '12D3KooWLL2Y1JmrAXkY7r8xbuSRtasfJLAarXmAaZPYxPnzgAJ3', publicKey: 'edpkuVjyKad7yCnNrCbGea7hi5Zh1zp5Cb1TvxUmnxC33fwKhq7daN', address: 'tz1PSmvRd3ySbh5aviFEMYGD6542LL5QnrMk' },
    { peerId: '12D3KooWK87KmBGJZZMP3keux62VF515mFRbNRFwbYxib7wWQR34', publicKey: 'edpku7vkvS6XaWzFjmPDYULNyYrS7Rf1vHuoQ9FD8zVcaFNJ51bJ82', address: 'tz1KrELvNVY4xKnujkXwrVLWuzWJEg9FvA8v' },
    { peerId: '12D3KooWDgabT39cFp5j5mvJgiGPEppMuVgDCsNtBCh1Q8ejBCA5', publicKey: 'edpkuqoXhgeXYZxn6yVWuy9UrWKazyahPaAbwnuZYknRefeLVVK3ar', address: 'tz1YKquTvvSE2B5kvGyf1AYeXD6b6cMDSzDe' },
    { peerId: '12D3KooWEKXXjviRoWwoB37UzBT4qjUBbQH8bypWy3YWmyfvR736', publicKey: 'edpkv6xHMqShSMr4CK3Vzg7mD1hina7eBkokrMoKpuYj55BVd18rjN', address: 'tz1TQ4fpSFNZ6D9vrcwBz9yzM2SNjDj5YoU7' },
    { peerId: '12D3KooWRGcN9uh633ucfUJ3XQ69n31mB2jPHKtrw7mfCSJdLz97', publicKey: 'edpku8MxEyEKHPsPeUBSBz5a5QbemdPbiQVsobdC3SnC9UDf4yMHTL', address: 'tz1bPLbmiseCCWtW7RZ9t2RkNyboB9XT4exJ' }
  ];

  public constructor(
    private readonly _config: OracleConfig,
  ) {
    const { rpcUrl } = this._config;
    this._tezos = new TezosToolkit(rpcUrl);
  }
  
  public async onModuleInit(): Promise<void> {
    this._logger.log('Hello from contract service');
  }

  public async getFValue(): Promise<number> {
    return Math.floor((this._bigArray.length - 1) / 3);
  }

  public async getOraclesAddresses(aggregatorAddress: string): Promise<MichelsonMap<string, string>> {
    const contractInstance = await this._tezos.contract.at(aggregatorAddress);
    const storage: AggregatorStorage = await contractInstance.storage();
    const oracleAddresses = storage.oracleAddresses;
    // oracleAddresses.forEach((value, key) => {
    //   this._logger.debug(`Oracle authorized -> [address]: ${key} - [publicKey]: ${value}`);
    // });
    return oracleAddresses;
  }

  public async isOracleAddressAuthorized(aggregatorAddress: string, oracleAddress: string): Promise<boolean>{
    const oracleAddresses = await this.getOraclesAddresses(aggregatorAddress);
    return oracleAddresses.has(oracleAddress);
  }

  // public async getPublicKeyFromAddressOracle(aggregatorAddress: string, oracleAddress: string): Promise<string>{
  //   const oracleAddresses = await this.getOraclesAddresses(aggregatorAddress);
  //   return oracleAddresses.get(oracleAddress) || '';
  // }

  public async getInfosFromAddressOracle(aggregatorAddress: string, oracleAddress: string): Promise<any>{
    const result = this._bigArray.find(element => {
      if (element.address === oracleAddress) {
        return true;
      }
      return false;
    });
    return result || {};
  };

  public async getInfosFromPeerId(aggregatorAddress: string, peerId: string): Promise<any>{
    const result = this._bigArray.find(element => {
      if (element.peerId === peerId) {
        return true;
      }
      return false;
    });
    return result || {};
  };

  public async packObservations(oraclePriceResponsesForPack: MichelsonMap<string, BigNumber>): Promise<string>{
    const typeMap: MichelsonType = {
      prim: 'map',
      args: [ 
        { prim: 'address'},
        { prim: 'nat'}
      ],
      annots: [
        "%oraclePriceResponsesForPack"
      ]};

    const params = oraclePriceResponsesForPack;
    const schema = new Schema(typeMap)
    const toPack = schema.Encode(params);
    const priceCodec = packDataBytes(toPack, typeMap);
    return priceCodec.bytes;
  }

  public async signOraclePriceResponses(
    oraclePriceResponsesForPack: MichelsonMap<string, BigNumber>,
    signer: InMemorySigner): Promise<string> {

    const signature_observations = await signer.sign(await this.packObservations(oraclePriceResponsesForPack));
    return signature_observations.sig;
  }

  public async signCompressedReport(observations: IObservation[], secretKey: string): Promise<string>{
    const signer = new InMemorySigner(secretKey);

    const oraclePriceResponsesForPack = new MichelsonMap<string, BigNumber>();
    for (const { oracle, price} of observations) {
      const {address} = await this.getInfosFromPeerId(this._config.aggregatorAddress, oracle);
      oraclePriceResponsesForPack.set(address, price);
    };

    return await this.signOraclePriceResponses(oraclePriceResponsesForPack, signer);
  }

  public async verifyReportSignature(report: ICompressedReport, signature: ISignature): Promise<boolean>{
    const oraclePriceResponsesForPack = new MichelsonMap<string, BigNumber>();
    for (const { oracle, price} of report.observations) {
      const {address} = await this.getInfosFromPeerId(this._config.aggregatorAddress, oracle);
      oraclePriceResponsesForPack.set(address, price)
    };
    console.log("verifyReportSignature")
    const msg = await this.packObservations(oraclePriceResponsesForPack);
    const { publicKey} = await this.getInfosFromAddressOracle(this._config.aggregatorAddress,signature.oracle)

    return verifySignature(msg, publicKey, signature.signature);
  }   

  public async verifyAttestedReport(attestedReport: IAttestedReport): Promise<boolean>{
    const oraclePriceResponsesForPack = new MichelsonMap<string, BigNumber>();
    for (const { oracle, price} of attestedReport.observations) {
      const {address} = await this.getInfosFromPeerId(this._config.aggregatorAddress, oracle);
      oraclePriceResponsesForPack.set(address, price)
    };
    console.log("verifyAttestedReport")

    const msg = await this.packObservations(oraclePriceResponsesForPack);
    
    let isEverythingOk = true;
    // verify for each observation.oracle == signatures.oracle


    // verify all signatues
    attestedReport.observations.forEach(async ({ oracle }) => {
      const toto = attestedReport.signatures.find(element => {
        if (element.oracle === oracle) {
          return true;
        }
        return false;
      });
      if (!toto){
        isEverythingOk = false;
      } else {
        const {publicKey} = await this.getInfosFromAddressOracle(this._config.aggregatorAddress, toto.oracle);
        if(!verifySignature(msg, publicKey, toto.signature)){
          isEverythingOk = false;
        };

      }
    });
    return isEverythingOk;
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
