import { Injectable, Logger } from '@nestjs/common';
import { createLibp2p, Libp2p } from 'libp2p';
import { Mplex } from '@libp2p/mplex';
import { Noise } from '@chainsafe/libp2p-noise';
import { GossipSub } from '@chainsafe/libp2p-gossipsub';
import { Bootstrap } from '@libp2p/bootstrap';
import { KadDHT } from '@libp2p/kad-dht';
import { OracleConfig } from './oracle.config.js';
import { createFromJSON } from '@libp2p/peer-id-factory';
import { ContractService } from './contract.service.js';
import { TCP } from '@libp2p/tcp';
import { Transport } from '@libp2p/interface-transport';
import { Libp2pNode } from 'libp2p/dist/src/libp2p.js';

@Injectable()
export class NodeService {
  private readonly _logger: Logger = new Logger(NodeService.name);
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
      peerListenAddress,
      peerListenPort
    } = this._config;

    const peerId = await createFromJSON({
      id,
      pubKey,
      privKey
    });

    // const peersIdList: string[] = [];
    // const oracleAddresses = await this._contractService.getOraclesAddresses(this._config.aggregatorAddress);
    // for (const [, value] of oracleAddresses.entries()) {
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
        listen: [`/ip4/${peerListenAddress}/tcp/${peerListenPort}`]
      },
      transports: [new TCP() as unknown as Transport],
      streamMuxers: [new Mplex()],
      connectionEncryption: [new Noise()],
      pubsub: new GossipSub({
        emitSelf: true
      }),
      peerDiscovery: [
        new Bootstrap({
          interval: 10000,
          list: bootstrapPeers
        })
      ],
      dht: new KadDHT(),
      connectionManager: {
        autoDial: true
      },

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

    (this._node as Libp2pNode).components.getAddressManager().addEventListener('change:addresses', (a) => {
      const addresses = this._node.getMultiaddrs();
      this._logger.verbose(`My multiaddresses: ${JSON.stringify(addresses)}`);
    });

    // Log a message when a remote peer connects to us
    this._node.connectionManager.addEventListener('peer:connect', (evt) => {
      const connection = evt.detail;
      this._logger.debug('Connected to: ', connection.remotePeer.toString());
    });
    // Log a message when a remote peer disconnects from us
    this._node.connectionManager.addEventListener('peer:disconnect', (evt) => {
      const connection = evt.detail;
      this._logger.debug('Disconnected from: ', connection.remotePeer.toString());
    });

    // Start listening
    await this._node.start();

    // Output listen addresses to the console
    console.log('Listener ready, listening on:');

    this._node.getMultiaddrs().forEach((ma) => {
      this._logger.verbose(ma.toString());
    });
  }

  public get node(): Libp2p {
    return this._node;
  }
}
