import { keys } from '@libp2p/crypto';
import { createSecp256k1PeerId } from '@libp2p/peer-id-factory';
import { toString } from 'uint8arrays';

// const pubKey = keys.unmarshalPublicKey(new Buffer('CAESIB3LuOsvQXa/QtLkCtHqfEdDnXDiDtGIKB42deJZQSZb', 'base64'));
// const privKey = await keys.unmarshalPrivateKey(new Buffer('CAESQJhgTKhCqif5bg/4RS4mPfjIp/TNA6c7licLcTFumPchHcu46y9Bdr9C0uQK0ep8R0OdcOIO0YgoHjZ14llBJls=', 'base64'));
//
// const data = new Uint8Array(['1', '2', '3']);
// const data2 = new Uint8Array(['1', '2', '4']);

// const signature = await privKey.sign(data);

let peerId;
do {
  peerId = await createSecp256k1PeerId();
  console.log(
    JSON.stringify({
      peerId,
      publicKey: toString(peerId.publicKey, 'base64pad'),
      privateKey: toString(peerId.privateKey, 'base64pad')
    })
  );
} while (peerId.toString().charAt(peerId.toString().length - 1) !== '7');
