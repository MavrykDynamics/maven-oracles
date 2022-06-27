import {Injectable, Logger, OnModuleInit} from '@nestjs/common';
import {HttpService} from '@nestjs/axios';
import { packDataBytes, MichelsonData, MichelsonType } from '@taquito/michel-codec';
import { InMemorySigner } from '@taquito/signer';

import {ContractConfig} from "./contract.config.js";
import { MichelsonMap, TezosToolkit } from '@taquito/taquito';
import BigNumber from 'bignumber.js';
import { Schema } from '@taquito/michelson-encoder';
import { AggregatorStorage, OraclePriceResponsesForPackValue, OraclePriceResponsesValue } from './aggregators.js';

@Injectable()
export class ContractService implements OnModuleInit {
  private readonly logger = new Logger(ContractService.name);

  private accounts = {
    alice: {
      pkh: 'tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb',
      sk: 'edsk3QoqBuvdamxouPhin7swCvkQNgq4jP5KZPbwWNnwdZpSpJiEbq',
      pk: 'edpkvGfYw3LyB1UcCahKQk4rF2tvbMUk8GFiTuMjL75uGXrpvKXhjn',
    },
    bob: {
      pkh: 'tz1aSkwEot3L2kmUvcoxzjMomb9mvBNuzFK6',
      sk: 'edsk3RFfvaFaxbHx8BMtEW1rKQcPtDML3LXjNqMNLCzC3wLC1bWbAt',
      pk: 'edpkurPsQ8eUApnLUJ9ZPDvu98E8VNj4KtJa1aZr16Cr5ow5VHKnz4',
    },
    eve: {
      pkh: 'tz1MnmtP4uAcgMpeZN6JtyziXeFqqwQG6yn6',
      sk: 'edsk3Sb16jcx9KrgMDsbZDmKnuN11v4AbTtPBgBSBTqYftd8Cq3i1e',
      pk: 'edpku9qEgcyfNNDK6EpMvu5SqXDqWRLuxdMxdyH12ivTUuB1KXfGP4',
    },
  };

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ContractConfig,
    private Tezos: TezosToolkit
  ) {
    const { rpcUrl } = this.config;
    Tezos = new TezosToolkit(rpcUrl);
  }
  

  async onModuleInit(): Promise<void> {
    this.logger.log('Hello from contract service');
    // await this.runVerify()
    
  }

  public async runVerify(){
    const { aggregatorAddress } = this.config;

    const oracle1_signer = new InMemorySigner(this.accounts.alice.sk);
    const oracle2_signer = new InMemorySigner(this.accounts.bob.sk);


    const contractInstance = await this.Tezos.contract.at(aggregatorAddress);

    const oracle1_price = new BigNumber(100);
    const oracle1_address = this.accounts.alice.pkh;
    const oracle2_price = new BigNumber(150);
    const oracle2_address = this.accounts.bob.pkh;

    const oracle1_signature = await this.signOracleObservation(oracle1_price,oracle1_address, oracle1_signer);
    const oracle2_signature = await this.signOracleObservation(oracle2_price,oracle2_address, oracle2_signer);


    const oraclePriceResponses = new MichelsonMap<string, OraclePriceResponsesValue>();
    oraclePriceResponses.set(oracle1_address, {
      oracleSignature: oracle1_signature,
      priceSalted: [oracle1_price, oracle1_address]
    });
    oraclePriceResponses.set(oracle2_address, {
      oracleSignature: oracle2_signature,
      priceSalted: [oracle2_price, oracle2_address]
    });

    const oraclePriceResponses_forPack = new MichelsonMap<string, OraclePriceResponsesForPackValue>();
    oraclePriceResponses_forPack.set(oracle1_address, {
      oracleSignature: oracle1_signature,
      oracleObservation_price: oracle1_price, 
      oracleObservation_address: oracle1_address
    });
    oraclePriceResponses_forPack.set(oracle2_address, {
      oracleSignature: oracle2_signature,
      oracleObservation_price: oracle2_price, 
      oracleObservation_address: oracle2_address
    });
    
    const oracle1_signature_observations = await this.signOraclePriceResponses(oraclePriceResponses_forPack, oracle1_signer);
    const oracle2_signature_observations = await this.signOraclePriceResponses(oraclePriceResponses_forPack, oracle2_signer);

    const signatures = new MichelsonMap<string, string>();
    signatures.set(oracle1_address, oracle1_signature_observations);
    signatures.set(oracle2_address, oracle2_signature_observations);


    const op = contractInstance.methodsObject.verify(
      {
        oraclePriceResponses,
        signatures
      }
    );
    
    this.Tezos.setSignerProvider(oracle1_signer);
    const tx = await op.send();
    await tx.confirmation();

    const after_storage: AggregatorStorage = await contractInstance.storage();
    console.log(after_storage.lastPrice.toString())
  }

  public async getOraclesAddresses(aggregatorAddress: string): Promise<MichelsonMap<string, string>> {
    const contractInstance = await this.Tezos.contract.at(aggregatorAddress);
    const storage: AggregatorStorage = await contractInstance.storage();
    const oracleAddresses = storage.oracleAddresses;
    oracleAddresses.forEach((value, key) => {
      this.logger.debug(`Oracle authorized -> [address]: ${key} - [publicKey]: ${value}`);
    });
    return oracleAddresses;
  }


  public async signOracleObservation(price: BigNumber, address: string, signer: InMemorySigner): Promise<string> {
    const data: MichelsonData = {
      prim: 'Pair', args: [{ int: price.toString() }, { string: address }]

    };
    const type: MichelsonType = {
      prim: 'pair', args: [{ prim: 'nat' }, { prim: 'address' }]
    };
    const priceCodec = packDataBytes(data, type);
    const signature = await signer.sign(priceCodec.bytes);
    return signature.sig;
  }

  public async signOraclePriceResponses(oraclePriceResponses_forPack: any, signer: InMemorySigner): Promise<string> {
    const type2_map: MichelsonType = {
      prim: 'map',
      args: [ 
        { prim: 'address'},
        {
        prim: 'pair', args: [
            {prim: 'pair', args: [{ prim: 'nat', annots: [ "%oracleObservation_price" ] }, { prim: 'address', annots: [ "%oracleObservation_address" ] }]},
            { prim: 'signature', annots: [ "%oracleSignature" ] }
        
      ]}
      ],
      annots: [
        "%oraclePriceResponses_forPack"
      ]};

    const params = oraclePriceResponses_forPack;
    const schema = new Schema(type2_map)
    const toPack = schema.Encode(params);
    const priceCodec2 = packDataBytes(toPack, type2_map);

    const signature_observations = await signer.sign(priceCodec2.bytes);
    return signature_observations.sig;
  }

}
