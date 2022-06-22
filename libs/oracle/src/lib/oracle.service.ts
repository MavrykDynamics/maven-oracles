import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createLibp2p } from 'libp2p';
import { TCP } from '@libp2p/tcp';
import { Mplex } from '@libp2p/mplex';
import { Noise } from '@chainsafe/libp2p-noise';
import { GossipSub } from '@chainsafe/libp2p-gossipsub';
import { Bootstrap } from '@libp2p/bootstrap';
import { KadDHT } from '@libp2p/kad-dht';
import { OracleConfig } from './oracle.config.js';
import { createFromJSON } from '@libp2p/peer-id-factory';

@Injectable()
export class OracleService implements OnModuleInit {
  private readonly logger = new Logger(OracleService.name);

  constructor(private readonly config: OracleConfig) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Hello from oracle service');

    const {
      bootstrapPeers,
      peerId: id,
      peerPubKey: pubKey,
      peerPrivateKey: privKey,
      peerListenAddress,
      peerListenPort
    } = this.config;
    const peerId = await createFromJSON({
      id,
      pubKey,
      privKey
    });

    this.logger.verbose(`Using bootstrap peers: ${bootstrapPeers}`);

    // This whitelist should come from the smart contracts
    const peerIdWhitelist = [
      // Bootstrap peer
      'QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm',

      // Oracles
      '12D3KooWJQWBQvefFGj3uAzKGhpZYWYGKtj2fNQAG47aov4uj9p1',
      '12D3KooWBpgAXhUAgjPAwEk5FJ9DRB2kFbuj8KLkPPmqKKmzrXz2',
      '12D3KooWLL2Y1JmrAXkY7r8xbuSRtasfJLAarXmAaZPYxPnzgAJ3'
      // '12D3KooWK87KmBGJZZMP3keux62VF515mFRbNRFwbYxib7wWQR34'
    ];

    const node = await createLibp2p({
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
    node.connectionManager.addEventListener('peer:connect', (evt) => {
      const connection = evt.detail;
      this.logger.debug('Connected to: ', connection.remotePeer.toString());
    });

    node.addEventListener('peer:discovery', (peerInfo) => {
      // No need to dial, autoDial is on
      this.logger.debug('Discovered:', peerInfo.detail.multiaddrs.toString());
    });

    // Start listening
    await node.start();

    const topic = 'abcd';
    await node.pubsub.subscribe(topic);

    node.pubsub.addEventListener('message', (msg) => {
      const decoder = new TextDecoder();
      this.logger.log(
        `Received from ${msg.detail.from.toString()} on topic: ${msg.detail.topic}: ${decoder.decode(
          msg.detail.data
        )}`
      );
    });

    // Output listen addresses to the console
    console.log('Listener ready, listening on:');
    node.getMultiaddrs().forEach((ma) => {
      this.logger.verbose(ma.toString());
    });

    setInterval(async (args) => {
      this.logger.log('sending random value: ');
      const encoder = new TextEncoder();
      try {
        await node.pubsub.publish(topic, encoder.encode('coucou'));
      } catch (e) {
        this.logger.error('failed to send random value');
      }
    }, 1000 * 10);
  }
}
