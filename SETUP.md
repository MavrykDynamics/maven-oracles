## How to deploy an oracle using Docker Compose

### Docker (if it is already installed, you can skip this step)

Prerequisite: Docker (with Docker Compose).

Here is the fast install instructions:
```
curl -fsSL https://get.docker.com -o get-docker.sh

sh ./get-docker.sh

sudo usermod -aG docker $USER
newgrp docker
```

See [manual install instructions](https://docs.docker.com/engine/install/debian/)

### Set up
Create `docker-compose.yml` file:

*Note: if you are deploying on a raspberry pi (64-bit OS), use the `ghcr.io/mavryk-network/mavseal:mavryk-v1.2.3-arm64` docker image for mavseal instead of the `-amd64` image.*

```yaml
# docker-compose.yml
version: '3.7'

services:
  oracle:
    restart: always
    image: mavrykdynamics/maven-oracle:latest
    env_file:
      - .env
    environment:
      - SIGNER_URL=http://localhost:6732
    network_mode: host

  mavseal:
    image: ghcr.io/mavryk-network/mavseal:mavryk-v1.2.3-amd64
    ports:
      - '6732:6732'
    volumes:
      - ./mavseal.yaml:/etc/mavseal.yaml
      - ./secret.json:/etc/secret.json
```

Create `.env` file (See [config reference](./CONFIG.md):
```dotenv
# .env

# Replace with your RPC url
RPC_URL=https://ithacanet.ecadinfra.com
SIGNER_URL=http://mavseal:6732

# Bootstrap peers addresses, separated by a white space
P2P_BOOTSTRAP_PEERS=/ip4/172.24.2.100/tcp/23456/p2p/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm /ip4/172.24.2.2/tcp/23456/p2p/12D3KooWBpgAXhUAgjPAwEk5FJ9DRB2kFbuj8KLkPPmqKKmzrXz2 /ip4/172.24.2.3/tcp/23456/p2p/12D3KooWLL2Y1JmrAXkY7r8xbuSRtasfJLAarXmAaZPYxPnzgAJ3 /ip4/172.24.2.4/tcp/23456/p2p/12D3KooWK87KmBGJZZMP3keux62VF515mFRbNRFwbYxib7wWQR34 /ip4/172.24.2.5/tcp/23456/p2p/12D3KooWDgabT39cFp5j5mvJgiGPEppMuVgDCsNtBCh1Q8ejBCA5 /ip4/172.24.2.6/tcp/23456/p2p/12D3KooWEKXXjviRoWwoB37UzBT4qjUBbQH8bypWy3YWmyfvR736 /ip4/172.24.2.7/tcp/23456/p2p/12D3KooWRGcN9uh633ucfUJ3XQ69n31mB2jPHKtrw7mfCSJdLz97

# Your own generated libp2p peer id, public and private key
P2P_PEER_ID=
P2P_PEER_PUBLIC_KEY=
P2P_PEER_PRIVATE_KEY=

# Mavryk public key and public key hash (= Address)
MAVRYK_ADDRESS=
MAVRYK_PUBLIC_KEY=

# Put your Alphavantage API key here
ALPHAVANTAGE_API_KEY=""

# Put your Messari API key here
MESSARI_API_KEY=""

# Mavryk polling interval for webmavryk. Must be lower than block time
MAVRYK_POLLING_INTERVAL_MILLISECONDS=2000

# Aggregator smart contract addresses, separated by a comma. Change this based on which network you are operating on. Only list the aggregator you want to push data too and where you are registered on.
AGGREGATOR_SMART_CONTRACT_ADDRESSES=KT1Qq4RD4vWcFshShSMt5vGLXP7gZBdiykEU
```

Setup mavseal following [this configuration guide](https://github.com/mavryk-network/mavseal/blob/main/README.md)
Below is an example with a local private key. THIS IS NOT RECOMMENDED FOR PRODUCTION, Use local key storage for testing/development only.

Create `mavseal.yaml` file (THIS IS NOT RECOMMENDED FOR PRODUCTION, Use local key storage for testing/development only.): 
```yaml
server:
  # Address/Port that Mavseal listens on
  address: :6732
  # Address/Port that Mavseal serves prometheus metrics on
  utility_address: :9583

vaults:
  # Name of vault
  # THIS IS NOT RECOMMENDED FOR PRODUCTION, Use local key storage for testing/development only.
  local_file_keys:
    driver: file
    config:
      file: /etc/secret.json

# List enabled public keys hashes here
mavryk:
  YOUR_MAVRYK_ADDRESS: # Your mavryk address
    log_payloads: true
    # `allow` maps each permitted request type to the operation kinds it may
    # contain (mavseal >= 1.2.0). Request types: [block, endorsement,
    # preendorsement, generic, failing_noop]. For `generic`, list the allowed
    # operation kinds (transaction, delegation, origination, reveal, ...).
    allow:
      generic:
        - transaction
      failing_noop:
```

Create `secret.json` file (THIS IS NOT RECOMMENDED FOR PRODUCTION, Use local key storage for testing/development only.): 
```json5
// THIS IS NOT RECOMMENDED FOR PRODUCTION, Use local key storage for testing/development only.
[
  {
    "name": "oracle1",
    "value": "YOUR_MAVRYK_PRIVATE_KEY"
  }
]
```

Once everything is set up, simply do:
```shell
# Docker v2 +
docker compose up

# Docker v1
docker-compose up
```
