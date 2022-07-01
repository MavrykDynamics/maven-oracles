import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createLibp2p, Libp2p } from 'libp2p';
import { TCP } from '@libp2p/tcp';
import { Mplex } from '@libp2p/mplex';
import { Noise } from '@chainsafe/libp2p-noise';
import { GossipSub } from '@chainsafe/libp2p-gossipsub';
import { Bootstrap } from '@libp2p/bootstrap';
import { KadDHT } from '@libp2p/kad-dht';
import { OracleConfig } from './oracle.config.js';
import { createFromJSON } from '@libp2p/peer-id-factory';
import { ContractService } from './contract.service.js';

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
      bootstrapPeers,
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

    this._logger.verbose(`Using bootstrap peers: ${bootstrapPeers}`);

    let peersIdList: string[] = [];
    const oracleAddresses = await this._contractService.getOraclesAddresses(this._config.aggregatorAddress);
    for (let [key, value] of oracleAddresses.entries()) {
      peersIdList.push(value.oraclePeerId)
    }

    // TODO: Bootstrap peer list should come from config
    const peerIdWhitelist = [
      // Bootstrap peer
      'QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm',

      // Oracles
      ...peersIdList
    ];

    this._node = await createLibp2p({
      peerId,
      addresses: {
        listen: [`/ip4/${peerListenAddress}/tcp/${peerListenPort}`]
      },
      transports: [new TCP()],
      streamMuxers: [new Mplex()],
      connectionEncryption: [new Noise()],
      pubsub: new GossipSub({
        emitSelf: true
      }),
      peerDiscovery: [
        new Bootstrap({
          interval: 10000,
          list: bootstrapPeers.split(' ')
        })
      ],
      dht: new KadDHT(),
      connectionManager: {
        autoDial: true
      },
      connectionGater: {
        denyDialPeer: (peerId) => {
          return !peerIdWhitelist.includes(peerId.toString());
        },
        denyInboundEncryptedConnection: (peerId) => {
          return !peerIdWhitelist.includes(peerId.toString());
        }
      }
    });

    // Log a message when a remote peer connects to us
    this._node.connectionManager.addEventListener('peer:connect', (evt) => {
      const connection = evt.detail;
      this._logger.debug('Connected to: ', connection.remotePeer.toString());
    });

    // this._node.addEventListener('peer:discovery', (peerInfo) => {
    //   // No need to dial, autoDial is on
    //   this._logger.debug('Discovered:', peerInfo.detail.multiaddrs.toString());
    // });

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
