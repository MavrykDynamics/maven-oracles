<br/>
<p align="center">
<a href="https://mavryk.finance/" target="_blank">
<img src="https://mavryk.finance/logo.svg" width="225" alt="Chainlink logo">
</a>
</p>
<br/>

# Mavryk oracle node

# Description

The Mavryk system relies on Satellites to provide accurate and reliable pricing information for its collateral asset
classes.
Satellites are incentivized to provide correct data by rewarding them MVK for every data they send on the blockchain.  
Satellites are part of an oracle network. Their purpose is to provide data feed on the Tezos blockchain in exchange for
MVK reward. Data is then aggregated on the blockchain.


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
git clone git@github.com:mavrykfinance/mavryk-oracles.git
cd mavryk-oracles

./scripts/install.sh
```

## Start

```shell
./script/start.sh
```

## Test

```shell
rush test
```

## Using data aggregator API keys

Edit the api key env file to set your data sources api keys

```shell
vi .api-keys.env
```

## Start

```shell
./scripts/start.sh
```

## Stop

```shell
./scripts/stop.sh
```

# License

[MIT](https://choosealicense.com/licenses/mit/)
