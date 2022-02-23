const {
  TezosToolkit,
  ContractAbstraction,
  ContractProvider,
  TezosOperationError,
  WalletParamsWithKind,
  OpKind, 
  Tezos, 
} = require("@taquito/taquito")
const { InMemorySigner, importKey } = require("@taquito/signer");
import assert, { ok, rejects, strictEqual } from "assert";
import { Utils, zeroAddress } from "../helpers/Utils";
import fs from "fs";
import { confirmOperation } from "../../scripts/confirmation";
const saveContractAddress = require("../../helpers/saveContractAddress")
const saveMVKDecimals = require('../../helpers/saveMVKDecimals')
import { MichelsonMap } from "@taquito/michelson-encoder";

const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);   
chai.should();

import env from "../../env";
import { alice, bob, eve, mallory } from "../../scripts/sandbox/accounts";

import { MvkToken } from "../helpers/mvkHelper";
import { MockFa12Token } from "../helpers/mockFa12TokenHelper";
import { MockFa2Token } from "../helpers/mockFa2TokenHelper";

import { mvkStorage, mvkTokenDecimals } from '../../storage/mvkTokenStorage'
import { mockFa12TokenStorage } from "../../storage/mockFa12TokenStorage";
import { mockFa2TokenStorage } from "../../storage/mockFa2TokenStorage";

describe('Contracts Deployment for Tests', async () => {
  var utils: Utils
  var mvkToken: MvkToken
  var mockFa12Token : MockFa12Token
  var mockFa2Token : MockFa2Token
  var tezos
  let deployedDoormanStorage
  let deployedDelegationStorage
  let deployedMvkTokenStorage

  const signerFactory = async (pk) => {
    await tezos.setProvider({ signer: await InMemorySigner.fromSecretKey(pk) })
    return tezos
  }

  before('setup', async () => {
    utils = new Utils()
    await utils.init(alice.sk)

    //----------------------------
    // Originate and deploy contracts
    //----------------------------

    mvkStorage.generalContracts = MichelsonMap.fromLiteral({

    })
    mvkStorage.whitelistContracts = MichelsonMap.fromLiteral({

    })
    mvkToken = await MvkToken.originate(utils.tezos, mvkStorage)

    console.log('MVK token contract originated')

    mockFa12Token = await MockFa12Token.originate(
      utils.tezos,
      mockFa12TokenStorage
    );

    console.log("mock FA12 Token originated")

    mockFa2Token = await MockFa2Token.originate(
      utils.tezos,
      mockFa2TokenStorage
    );

    console.log("mock FA2 Token originated")

    /* ---- ---- ---- ---- ---- */

    tezos = mvkToken.tezos
    console.log('====== break ======')

    //----------------------------
    // Set remaining contract addresses - post-deployment
    //----------------------------

    

    //----------------------------
    // Save Contract Addresses to JSON (for reuse in JS / PyTezos Tests)
    //----------------------------
    await saveContractAddress("mvkTokenAddress", mvkToken.contract.address)
    await saveContractAddress("mockFa12TokenAddress", mockFa12Token.contract.address)
    await saveContractAddress("mockFa2TokenAddress", mockFa2Token.contract.address)

    //----------------------------
    // Save MVK Decimals to JSON (for reuse in JS / PyTezos Tests)
    //----------------------------
    await saveMVKDecimals(mvkTokenDecimals)

  });


  it(`test all contract deployments`, async () => {
    try{
        
        console.log("-- -- -- -- -- -- -- -- -- -- -- -- --") // break
        console.log("Test: All contracts deployed")
        console.log("-- -- -- -- -- Deployments -- -- -- --")
        console.log("MVK Token Contract deployed at:", mvkToken.contract.address);
        console.log("Mock FA12 Token Contract deployed at:", mockFa12Token.contract.address);
        console.log("Mock Fa2 Token Contract deployed at:", mockFa2Token.contract.address);

    } catch (e){
        console.log(e);
    }
  })
})
