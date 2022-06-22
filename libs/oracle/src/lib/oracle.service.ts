import {Injectable, Logger, OnModuleInit} from '@nestjs/common';
import {HttpService} from '@nestjs/axios';
import {createLibp2p} from 'libp2p';
import {TCP} from '@libp2p/tcp';
import {Mplex} from '@libp2p/mplex';
import {Noise} from '@chainsafe/libp2p-noise';
import {GossipSub} from '@chainsafe/libp2p-gossipsub';
import {Bootstrap} from '@libp2p/bootstrap';
import {KadDHT} from '@libp2p/kad-dht';
import {OracleConfig} from "./oracle.config.js";
import {createEd25519PeerId, createFromJSON} from "@libp2p/peer-id-factory";

@Injectable()
export class OracleService implements OnModuleInit {
  private readonly logger = new Logger(OracleService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly config: OracleConfig
  ) {
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Hello from oracle service');

    const {bootstrapPeers, peerId: id, peerPubKey: pubKey, peerPrivateKey: privKey} = this.config;
    const peerId = await createFromJSON({
        id,
        pubKey,
        privKey,
      }
    )

    this.logger.verbose(`Using bootstrap peers: ${bootstrapPeers}`);

    const node = await createLibp2p({
      peerId,
      addresses: {
        listen: [`/ip4/0.0.0.0/tcp/23456`],
      },
      transports: [new TCP()],
      streamMuxers: [new Mplex()],
      connectionEncryption: [new Noise()],
      pubsub: new GossipSub(),
      peerDiscovery: [
        new Bootstrap({
          interval: 10000,
          list: bootstrapPeers.split(' '),
        })
      ],
      dht: new KadDHT(),
      connectionManager: {
        autoDial: true
      },
    });

    // Log a message when a remote peer connects to us
    node.connectionManager.addEventListener('peer:connect', (evt) => {
      const connection = evt.detail;
      console.log('connected to: ', connection.remotePeer.toString());
    });

    node.addEventListener('peer:discovery', (peerInfo) => {
      // No need to dial, autoDial is on
      console.log('Discovered:', peerInfo.detail.multiaddrs.toString());
    });

    // Start listening
    await node.start();

    const topic = 'abcd';
    await node.pubsub.subscribe(topic);

    node.pubsub.addEventListener('message', (msg) => {
      const decoder = new TextDecoder();
      console.log(`Received on topic: ${JSON.stringify(msg.detail.topic)}`);
      console.log(`${decoder.decode(msg.detail.data)}`);
    });

    // Output listen addresses to the console
    console.log('Listener ready, listening on:');
    node.getMultiaddrs().forEach((ma) => {
      console.log(ma.toString());
    });

    setInterval(async (args) => {
      console.log('sending random value: ');
      const encoder = new TextEncoder();
      try {
        await node.pubsub.publish(topic, encoder.encode('coucou'));
      } catch (e) {
        console.error('failed to send random value');
      }
    }, 1000 * 10);
  }
}
