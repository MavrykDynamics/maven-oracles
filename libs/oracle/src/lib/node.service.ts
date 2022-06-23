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

@Injectable()
export class NodeService {
  private readonly _logger: Logger = new Logger(NodeService.name);
  private _node: Libp2p;

  public constructor(private readonly _config: OracleConfig) {}

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

    // This whitelist should come from the smart contracts
    const peerIdWhitelist = [
      // Bootstrap peer
      'QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm',

      // Oracles
      '12D3KooWJQWBQvefFGj3uAzKGhpZYWYGKtj2fNQAG47aov4uj9p1',
      '12D3KooWBpgAXhUAgjPAwEk5FJ9DRB2kFbuj8KLkPPmqKKmzrXz2',
      '12D3KooWLL2Y1JmrAXkY7r8xbuSRtasfJLAarXmAaZPYxPnzgAJ3',
      '12D3KooWK87KmBGJZZMP3keux62VF515mFRbNRFwbYxib7wWQR34',
      '12D3KooWDgabT39cFp5j5mvJgiGPEppMuVgDCsNtBCh1Q8ejBCA5',
      '12D3KooWEKXXjviRoWwoB37UzBT4qjUBbQH8bypWy3YWmyfvR736',
      '12D3KooWRGcN9uh633ucfUJ3XQ69n31mB2jPHKtrw7mfCSJdLz97'
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
