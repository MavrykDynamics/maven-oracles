/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable no-unused-expressions */
/* eslint-disable @typescript-eslint/no-floating-promises */
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { compile, compileLambdas, runMigrations, compileParameters } from './helpers.js';
import { NetworkName } from './env.js';
import * as process from 'process';

yargs(hideBin(process.argv))
  .command(
    'compile [format] [contract] [contracts_dir] [output_dir] [ligo_version] [is_apple_silicon]',
    'compiles the contract',
    {
      format: {
        description: 'fromat of output file',
        alias: 'f',
        type: 'string'
      },
      contract: {
        description: 'the contract to compile',
        alias: 'c',
        type: 'string'
      },
      contracts_dir: {
        description: 'contracts directory',
        alias: 'p',
        type: 'string'
      },
      output_dir: {
        description: 'output directory',
        alias: 'o',
        type: 'string'
      },
      ligo_version: {
        description: 'ligo version',
        alias: 'v',
        type: 'string'
      },
      is_apple_silicon: {
        description: 'cpu is an apple silicon boolean',
        alias: 'm',
        type: 'string'
      }
    },
    async (argv) => {
      compile(
        argv.format,
        argv.contract,
        argv.contracts_dir,
        argv.output_dir,
        argv.ligo_version,
        argv.is_apple_silicon
      );
      process.exit()
    }
  )
  .command(
    'compile-lambda [json] [contract]',
    'compile lambdas for the specified contract',
    {
      json: {
        description: 'input file relative path (with lambdas indexes and names)',
        alias: 'j',
        type: 'string'
      },
      contract: {
        description: 'input file relative path (with lambdas Ligo code)',
        alias: 'c',
        type: 'string'
      }
    },
    async (argv) => {
      await compileLambdas(argv.json, argv.contract);
      process.exit()
    }
  )
  .command(
    'compile-lambda-parameters [json] [contract]',
    'compile lambda parameters for the specified contract',
    {
      json: {
        description: 'input file relative path (with lambdas indexes and parameters)',
        alias: 'j',
        type: 'string'
      },
      contract: {
        description: 'input file relative path (with lambdas Ligo code)',
        alias: 'c',
        type: 'string'
      }
    },
    async (argv) => {
      await compileParameters(argv.json, argv.contract);
      process.exit()
    }
  )
  .command(
    'migrate [network] [from] [to]',
    'run migrations',
    {
      from: {
        description: 'the migrations counter to start with',
        alias: 'f',
        type: 'number'
      },
      to: {
        description: 'the migrations counter to end with',
        alias: 't',
        type: 'number'
      },
      network: {
        description: 'the network to deploy',
        alias: 'n',
        type: 'string'
      }
    },
    async (argv) => {
      await runMigrations(argv.from, argv.to, argv.network as NetworkName);
      process.exit()
    }
  )
  .help()
  .strictCommands()
  .demandCommand(1)
  .alias('help', 'h').argv;
