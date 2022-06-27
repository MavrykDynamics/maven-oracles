import { Property } from 'ts-convict';

export class ContractConfig {
  @Property({
    default: 'KT1NQzNAKK2rqgHCMoT3dru9KALgG22qRMD7',
    env: 'AGGREGATOR_ADDRESS',
    format: String,
  })
  public aggregatorAddress: string;

  @Property({
    default: 'https://ithacanet.ecadinfra.com',
    env: 'RPC_URL',
    format: String,
  })
  public rpcUrl: string;
}
