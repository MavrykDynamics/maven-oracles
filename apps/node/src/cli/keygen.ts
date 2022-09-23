import { createSecp256k1PeerId } from '@libp2p/peer-id-factory';

async function keygen() {
  const peerId = await createSecp256k1PeerId();

  console.log(`P2P_PEER_ID=${peerId}`);
  console.log(`P2P_PEER_PUBLIC_KEY=${Buffer.from(peerId.publicKey).toString('base64')}`);
  console.log(`P2P_PEER_PRIVATE_KEY=${Buffer.from(peerId.privateKey!).toString('base64')}`);
}

keygen();
