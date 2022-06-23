import {Injectable, Logger, OnModuleInit} from '@nestjs/common';
import {HttpService} from '@nestjs/axios';
import { packDataBytes, MichelsonData, MichelsonType } from '@taquito/michel-codec';
import { InMemorySigner } from '@taquito/signer';

import {ContractConfig} from "./contract.config.js";
import { MichelsonMap, TezosToolkit } from '@taquito/taquito';
import BigNumber from 'bignumber.js';
import { Schema } from '@taquito/michelson-encoder';
import { AggregatorStorage } from './aggregators.js';

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
    private readonly config: ContractConfig
  ) {
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Hello from contract service');

    const Tezos = new TezosToolkit('https://ithacanet.ecadinfra.com');

    const contractInstance = await Tezos.contract.at('KT1VfdZTPc8Aci4ojBAhs4fTLcnQFCg8j1By');
    const storage: AggregatorStorage = await contractInstance.storage();
    console.log({storage});
    const oracleAddresses = storage.oracleAddresses;
    oracleAddresses.forEach((value, key) => {
      console.log(`Oracle authorized -> [address]: ${key} - [publicKey]: ${value}`);
    });


    // SMART CONTRACT ENTRYPOINT PARAMETERS
    //     type oraclePriceResponseType is [@layout:comb] record [
    //       priceSalted:     nat                 // price
    //                        * bytes             // salt
    //                        * address;          // address
    //       oracleSignature: signature
    // ];
    // type leaderReponseType is   [@layout:comb] record [
    //   oraclePriceResponses: map (address, oraclePriceResponseType);
    //   signatures: map (address, signature);
    // ];

    const signer = new InMemorySigner(this.accounts.alice.sk);

    // ON PACK + SIGNE LE PRICESALTED
    const price = new BigNumber(123);
    const salt = "coucou";

    const data: MichelsonData = {
      prim: 'Pair',
      args: [
        { prim: 'Pair', args: [{ int: price.toString() }, { string: salt }] },
        { string: this.accounts.alice.pkh },
      ],
    };
    const type: MichelsonType = {
      prim: 'pair',
      args: [
        { prim: 'pair', args: [{ prim: 'nat' }, { prim: 'string' }] },
        { prim: 'address' },
      ],
    };
    const priceCodec = packDataBytes(data, type);
    const signature = await signer.sign(priceCodec.bytes);

    // ON CREER LA MAP 

    const oraclePriceResponses = new MichelsonMap();
    oraclePriceResponses.set("tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb", { 
      "priceSalted_price": price,
      "priceSalted_salt": salt,
      "priceSalted_address": this.accounts.alice.pkh,
      "oracleSignature": signature.sig }
      );
    console.log({oraclePriceResponses})

    // ON PACK + SIGNE LA MAP oraclePriceResponses

    const type2 = {
      prim: 'map',
      args: [
        { prim: 'address' },
        {
          prim: 'pair',
          args: [
                {
                  prim: 'pair',
                  args: [
                    { prim: 'pair', args: [{ prim: 'nat',"annots": [ "%priceSalted_price"] }, { prim: 'string',"annots": [ "%priceSalted_salt"] }] },
                    { prim: 'address',"annots": [ "%priceSalted_address"] },
                  ],
                },
                { prim: 'signature',"annots": [ "%oracleSignature" ] }
              ]
            }
      ],
      "annots": [
        "%oraclePriceResponses"
      ]
      
    };
    const data2 = {
      prim: 'map',
      args: [
        
          { string: this.accounts.alice.pkh },
          {
            prim: 'Pair',
            args: [
                    {
                      prim: 'Pair',
                      args: [
                        { prim: 'Pair', args: [{ int: price.toString() }, { string: salt }] },
                        { string: this.accounts.alice.pkh },
                      ],
                    },
                    { string: signature.sig }
                  ]
          },
      ],
    };

    const params = {
      oraclePriceResponses: oraclePriceResponses
    }


    // create a Schema to be used by Michelson Encoder
    const schema = new Schema(type2)

    // turn the params into their Michelson JSON version
    const toPack = schema.Encode(params)
    const priceCodec2 = packDataBytes(toPack, type2);

    console.log("ok ",priceCodec2)


    const signature2 = signer.sign(priceCodec2.bytes);

    const signatures = new MichelsonMap();
    signatures.set(this.accounts.alice.pkh, signature2);


    const op = contractInstance.methods.verify(
      oraclePriceResponses,
      signatures
    );

    console.log("before send operation send")
    
    const tx = await op.send();
    await tx.confirmation();

    



    // const type2: MichelsonType = {
    //   prim: 'map',
    //   args: [
    //     { prim: 'address' },
    //     {
    //       prim: 'pair',
    //       args: [
    //             {
    //               prim: 'pair',
    //               args: [
    //                 { prim: 'pair', args: [{ prim: 'nat' }, { prim: 'string' }] },
    //                 { prim: 'address' },
    //               ],
    //             },
    //             { prim: 'signature' }
    //           ]
    //         }
    //   ],
    // };
    // const data2: MichelsonData = {
    //   prim: 'map',
    //   args: [
    //     [
    //       { string: this.accounts.alice.pkh },
    //       {
    //         prim: 'Pair',
    //         args: [
    //                 {
    //                   prim: 'Pair',
    //                   args: [
    //                     { prim: 'Pair', args: [{ int: price.toString() }, { string: salt }] },
    //                     { string: this.accounts.alice.pkh },
    //                   ],
    //                 },
    //                 { string: signature }
    //               ]
    //       }
    //     ],
    //     [
    //       { string: this.accounts.bob.pkh },
    //       {
    //         prim: 'Pair',
    //         args: [
    //                 {
    //                   prim: 'Pair',
    //                   args: [
    //                     { prim: 'Pair', args: [{ int: price.toString() }, { string: salt }] },
    //                     { string: this.accounts.bob.pkh },
    //                   ],
    //                 },
    //                 { string: signature }
    //               ]
    //       }
    //     ]
    //   ],
    // };





    








  }

}
