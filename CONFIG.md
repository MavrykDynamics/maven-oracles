# Config reference

## Oracle config

| Key                                       | Description                                                         | Type                                        | Default value                    |
|-------------------------------------------|---------------------------------------------------------------------|:--------------------------------------------|----------------------------------|
| P2P_BOOTSTRAP_PEERS                       | Libp2p list of boostrap peers, separated by white space             | string                                      | None                             |
| P2P_LISTEN_ADDRESS                        | Libp2p listening address                                            | string                                      | 0.0.0.0                          |
| P2P_LISTEN_PORT                           | Libp2p listening port                                               | number                                      | 23456                            |
| P2P_PEER_ID                               | Libp2p peer id                                                      | string                                      | None                             |
| P2P_PEER_PUBLIC_KEY                       | Libp2p public key                                                   | string                                      | None                             |
| P2P_PEER_PRIVATE_KEY                      | Libp2p private key                                                  | string                                      | None                             |
| AGGREGATOR_FACTORY_SMART_CONTRACT_ADDRESS | Aggregator factory smart contract address                           | string                                      | None                             |
| RPC_URL                                   | Tezos RPC url                                                       | string                                      | https://ithacanet.ecadinfra.com/ |
| TEZOS_PUBLIC_KEY                          | Tezos public key                                                    | string                                      | None                             |
| TEZOS_ADDRESS                             | Tezos address (public key hash)                                     | string                                      | None                             |
| LOG_LEVEL                                 | Logger level.                                                       | 'error', 'warn', 'info', 'verbose', 'debug' | 'info                            |
| USE_FAKE_PRICES                           | Dev flag to generate fake prices instead of requesting data source. | boolean                                     | false                            |


## Transaction manager config

| Key                                 | Description              | Type   | Default value |
|-------------------------------------|--------------------------|:-------|---------------|
| SIGNER_URL                          | Signatory url            | string | None          |
| TEZOS_POLLING_INTERVAL_MILLISECONDS | Taquito polling interval | number | 5000          |


## Alphavantage fetcher config

| Key                   | Description                                                                                                              | Type   | Default value |
|-----------------------|--------------------------------------------------------------------------------------------------------------------------|:-------|---------------|
| ALPHAVANTAGE_API_KEY  | Alphavantage api key                                                                                                     | string | None          |
| ALPHAVANTAGE_INTERVAL | Alphavantage interval in minute. See available values [here](https://www.alphavantage.co/documentation/#crypto-intraday) | number | 1             |


## Coingecko fetcher config

| Key               | Description       | Type   | Default value |
|-------------------|-------------------|:-------|---------------|
| COINGECKO_API_KEY | Coingecko api key | string | None          |


## Messari fetcher config

| Key             | Description     | Type   | Default value |
|-----------------|-----------------|:-------|---------------|
| MESSARI_API_KEY | Messari api key | string | None          |


