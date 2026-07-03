<br/>
<p align="center">
<a href="https://mavenfinance.io/" target="_blank">
<img src="https://mavenfinance.io/logo.svg" width="225" alt="Chainlink logo">
</a>
</p>
<br/>

# Maven oracle node

# Description

The Maven system relies on Satellites to provide accurate and reliable pricing information for its collateral asset
classes.
Satellites are incentivized to provide correct data by rewarding them MVN for every data they send on the blockchain.  
Satellites are part of an oracle network. Their purpose is to provide data feed on the Mavryk blockchain in exchange for
MVN reward. Data is then aggregated on the blockchain.


## How it works

Data feed are organised in rounds triggered either by heartbeat (e.g. at least once every hour) or a significant deviation (e.g. the price it is tracking has moved more than 0.5% since last price update)
A round goal is to update the data feed (for example: USD/XTZ) on the blockchain.
Once a round is started, oracles form an off-chain consensus of the data to send to the blockchain, e.g. the median of the price observation from every oracles.


### How to be an oracle

New oracles can be added to the network using the Maveryk governance system.  
You have to send a request to the governance smart contract adding you as an oracle.
You have to deploy an oracle, for now in the cloud, but later raspberry pi

See [Setup guide](./SETUP.md) to know how to set up your own node

# Development

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker compose](https://docs.docker.com/compose/install/)
- [Node 16](https://nodejs.org/en/download/)

## Install

```shell
git clone git@github.com:maven-finance/maven-oracles.git
cd maven-oracles

./scripts/install.sh
```

## Start

This will start an environment with:
  - A local blokchain (flexmasa)
  - A blockchain explorer (better call dev)
  - 7 oracles

```shell
rush build
./scripts/start.sh

# To stop, use
# ./scripts/stop.sh
```

## Test

Run the repository unit tests using:

```shell
rush test
```

Run the integration tests using:

```shell
./integration/integration_1.sh
```

## Using data aggregator API keys

Edit the api key env file to set your data sources api keys

```shell
vi .api-keys.env
```

# License

[MIT](https://choosealicense.com/licenses/mit/)
