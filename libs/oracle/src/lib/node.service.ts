import { Injectable } from '@nestjs/common';
import { createLibp2p, Libp2p } from 'libp2p';
import { mplex } from '@libp2p/mplex';
import { noise } from '@chainsafe/libp2p-noise';
import { gossipsub, GossipSub } from '@chainsafe/libp2p-gossipsub';
import { bootstrap } from '@libp2p/bootstrap';
import { kadDHT } from '@libp2p/kad-dht';
import { OracleConfig } from './oracle.config.js';
import { createFromJSON } from '@libp2p/peer-id-factory';
import { ContractService } from './contract/index.js';
import { tcp } from '@libp2p/tcp';
import { getLogger } from './logger.js';
import { Logger } from 'winston';
import { pubsubPeerDiscovery } from '@libp2p/pubsub-peer-discovery';
import { PeerDiscovery } from '@libp2p/interface-peer-discovery';
import { Components } from 'libp2p/src/components';
import { Libp2pNode } from 'libp2p/libp2p';

@Injectable()
export class NodeService {
  private readonly _logger: Logger = getLogger({
    defaultMeta: {
      service: NodeService.name
    }
  });

  private _node: Libp2p;

  public constructor(
    private readonly _config: OracleConfig,
    private readonly _contractService: ContractService
  ) {}

  public async init(): Promise<void> {
    const {
      bootstrapPeers: bootstrapPeersString,
      peerId: id,
      peerPubKey: pubKey,
      peerPrivateKey: privKey,
      peerListenProtocol,
      peerListenAddress,
      peerListenPort
    } = this._config;

    const peerId = await createFromJSON({
      id,
      pubKey,
      privKey
    });

    // const peersIdList: string[] = [];
    // const oracleLedger = await this._contractService.getOraclesAddresses(this._config.aggregatorAddress);
    // for (const [, value] of oracleLedger.entries()) {
    //   peersIdList.push(value.oraclePeerId);
    // }

    const bootstrapPeers = bootstrapPeersString.split(' ');

    this._logger.verbose(`Using bootstrap peers: ${bootstrapPeers}`);

    //    const bootstrapPeerIds = bootstrapPeers.map((addr) => new Multiaddr(addr).getPeerId()); // /ip4/172.24.2.100/tcp/23456/p2p/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm

    //    const peerIdWhitelist = [
    //      // Bootstrap peers
    //      ...bootstrapPeerIds,
    //
    //      // Oracles
    //      ...peersIdList
    //    ];

    this._node = await createLibp2p({
      peerId,
      addresses: {
        listen: [`/${peerListenProtocol}/${peerListenAddress}/tcp/${peerListenPort}`]
      },
      transports: [tcp()],
      streamMuxers: [mplex()],
      connectionEncryption: [noise()],
      pubsub: gossipsub({
        emitSelf: true,
        allowPublishToZeroPeers: true
      }),
      peerDiscovery: [
        bootstrap({
          timeout: 10e3,
          list: bootstrapPeers
        }),
        pubsubPeerDiscovery() as unknown as (components: Components) => PeerDiscovery
      ],
      dht: kadDHT(),
      connectionManager: {},

      // TODO: re-add a white list mechanism
      //  connectionGater: {
      //    denyDialPeer: (peerId) => {
      //      return !peerIdWhitelist.includes(peerId.toString());
      //    },
      //    denyInboundEncryptedConnection: (peerId) => {
      //      return !peerIdWhitelist.includes(peerId.toString());
      //    }
      //  },
      nat: {
        enabled: true
      }
    });

    // Log a message when a remote peer connects to us
    this._node.addEventListener('peer:connect', (evt) => {
      // const connection = evt.detail;
      this._logger.debug(`Connected to: ${JSON.stringify(evt)}`);
    });
    // Log a message when a remote peer disconnects from us
    this._node.addEventListener('peer:disconnect', (evt) => {
      // const connection = evt.detail;
      this._logger.debug(`Disconnected from: ${JSON.stringify(evt)}`);
    });

    this._node.addEventListener('peer:discovery', (evt) => {
      // This spams a lot
      this._logger.silly(`Discovered (json): ${JSON.stringify(evt)}`);
    });

    this._logger.info('Starting');
    // Start listening
    await this._node.start();

    // Output listen addresses to the console
    this._logger.info(`Listener ready, listening on: ${this._node.getMultiaddrs().join(',')}`);
  }

  public get node(): Libp2p {
    return this._node;
  }
}
