# Mavryk Oracles 

## Dependencies

- **Docker** - used to run a local Tezos node together with the LIGO compiler (If you're on linux, follow the post-installation steps as well)
- **Node.js v12** - Javascript runtime environment that we'll use for testing and deployment
- **LIGO** - High level programming language for the Tezos blockchain
- **Taquito with Typescript & PyTezos** - Testing frameworks for Tezos


## Getting started

> Make sure to use node `v12 (at least)`.

**Unbox the starter kit & install the dependencies**
```shell
$ git clone https://github.com/mavrykfinance/mavryk-oracles.git
$ cd mavryk-oracles/src/contracts
$ npm i
```

Note: All relevant npm scripts have a version for running on Apple Silicon, adjust accordingly  

**Start up the local Mavryk Sandbox node**
```shell
$ npm run start-sandbox
```

**Compile the example contracts**
```shell
$ npm run compile
```

**Migrate the compiled contracts**
```shell
$ npm run migrate
```

**OR migrate to the Hangzhou test net**
```shell
$ npm run test-net-deploy
```

**Run specific tests or specific test files**
```shell
$ npm run test-full
$ npm run test-single-file <file-path>
$ npm run test-only
```

## Sandbox management

Archive mode sandbox Tezos node is provided within this box with RPC exposed at port `8732` and with ten accounts that are generously funded. You can find all account details in the terminal at the startup of the sandbox.


#### Commands

```shell
$ npm run start-sandboc
```

#### Available accounts
|alias  |pkh  |pk  |sk   |
|---|---|---|---|
|alice   |tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb   |edpkvGfYw3LyB1UcCahKQk4rF2tvbMUk8GFiTuMjL75uGXrpvKXhjn   |edsk3QoqBuvdamxouPhin7swCvkQNgq4jP5KZPbwWNnwdZpSpJiEbq   |
|bob   |tz1aSkwEot3L2kmUvcoxzjMomb9mvBNuzFK6   |edpkurPsQ8eUApnLUJ9ZPDvu98E8VNj4KtJa1aZr16Cr5ow5VHKnz4   |edsk3RFfvaFaxbHx8BMtEW1rKQcPtDML3LXjNqMNLCzC3wLC1bWbAt   |
|baker |  tz1W15VdfAc1ePgrGMyimCz1skJvY6hvMyiu | edpkuqBgimykYEEfcDAVrwguoUoQku2amoeGQoZLv4qVsWCzTWcM1u | edsk3TRzqPksMdn9YSgr5kBPEgj6WmKYA1QgzqjRVdFTzy9gi9vbzE |

We have also added 6 other accounts from the normal 4, they are all found in src/contracts/scripts/sandbox/accounts.js  
