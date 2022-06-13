# Setup an oracle on Raspberry Pi

The goal the oracles is to be deployed on Raspberry Pi using a Ledger device to store the private keys.  
But, as of now, the necessary Ledger App is not yet developed, so, right now, we are using [Signatory](https://github.com/ecadlabs/signatory) either with secret file on the Raspberry (NOT RECOMMENDED) or a cloud signer (See [supported backends](https://github.com/ecadlabs/signatory#backend-kmshsm-support-status))

## Prerequisites

To follow this guide you will need

- a Raspberry Pi
- a SD card that matches your Raspberry Pi

## Install Raspberry Pi OS

- Install [Raspberry Pi imager](https://www.raspberrypi.com/software/)
- Launch it and install Raspberry Pi OS on your SD card. Make sure to have a way to login to your Raspberry Pi (either ssh or login/password) in the imager options
- Put your SD card in the Rasberry Pi and plug it

## Install Mavryk oracle

- Login to your Raspberry pi using ssh or login/password

- Create a `db` folder
- Create a `docker-compose.yml` file:
```
version: '3.7'

services:
  oracle:
    restart: always
    image: tezosdynamics/mavryk-oracle:latest
    environment:
      - RPC_URL=<YOUR_RPC_URL>
      - ORACLE_PKH=<YOUR_ADDRESS>
      - ORACLE_WITHDRAW_ADDRESS=<YOUR_ADDRESS>
      - ENABLE_DEVIATION_TRIGGER=true
      - SIGNER_URL=http://signatory-oracle-1:6732
      - COMMIT_DATA_DB_FILE=/home/node/db/database.oracle1.db
    env_file:
      - .contracts.ithacanet.env
    volumes:
      - ./db:/home/node/db

  signatory-oracle-1:
    restart: always
    image: tezosdynamics/signatory:v0.3.0-beta-rc2
    volumes:
      - ./signatory.yaml:/etc/signatory.yaml
      - ./secret.json:/etc/secret.json
```

- Create a `signatory.yaml` file:
```
server:
  # Address/Port that Signatory listens on
  address: :6732
  # Address/Port that Signatory serves prometheus metrics on
  utility_address: :9583

vaults:
  # Name of vault
  local_file_keys:
    driver: file
    config:
      file: /etc/secret.json

# List enabled public keys hashes here
tezos:
  # Default policy allows "block" and "endorsement" operations
  <YOUR_ADDRESS>:
    log_payloads: true
    allowed_operations:
      # List of [generic, block, endorsement]
      - generic
      - block
      - endorsement
    allowed_kinds:
      # List of [endorsement, ballot, reveal, transaction, origination, delegation, seed_nonce_revelation, activate_account]
      - transaction
      - endorsement

```

- Create a `secret.json`
```
[
  {
    "name": "oracle-key",
    "value": "<YOUR_PRIVATE_KEY>"
  }
]

```


Once everything is setup, your folder should look like this:

```
/home/pi
├── docker-compose.yml
├── secret.json
├── signatory.dev.yaml
└── db/

```

You can now run:

```
docker-compose up -d
```

To see the logs, do:
```
docker-compose logs orale -f
```
