import { accountPerNetwork } from '../accounts.js';

export type NetworkName =
  | 'development'
  | 'basenet'
  | 'basenet'
  | 'mainnet';

export interface INetwork {
  rpc: string;
  network_id: string;
  secretKey: string;
  pkh: string;
  port: number;
}

export interface INetworkConfig {
  confirmationPollingTimeoutSecond: number;
  network: NetworkName;
  networks: Record<NetworkName, INetwork>;
  syncInterval: number;
  confirmTimeout: number;
  buildDir: string;
  migrationsDir: string;
  contractsDir: string;
  ligoVersion: string;
}

export const networkConfig: INetworkConfig = {
  confirmationPollingTimeoutSecond: 500000,
  syncInterval: 0, // 0 for tests, 5000 for deploying
  confirmTimeout: 90000, // 90000 for tests, 180000 for deploying
  buildDir: 'src/lib/contracts/json',
  migrationsDir: 'src/lib/migrations',
  contractsDir: 'src/lib/contracts/main',
  ligoVersion: '0.60.0',
  network: 'development',
  networks: {
    development: {
      rpc: 'http://localhost:8732',
      network_id: '*',
      secretKey: accountPerNetwork.development.alice.sk,
      pkh: accountPerNetwork.development.alice.pkh,
      port: 8732
    },
    basenet: {
      rpc: 'https://basenet.rpc.mavryk.network',
      port: 443,
      network_id: '*',
      secretKey: accountPerNetwork.basenet.alice.sk,
      pkh: accountPerNetwork.basenet.alice.pkh
    },
    mainnet: {
      rpc: 'https://mainnet.rpc.mavryk.network',
      port: 443,
      network_id: '*',
      secretKey: accountPerNetwork.mainnet.alice.sk,
      pkh: accountPerNetwork.mainnet.alice.pkh
    }
  }
};
