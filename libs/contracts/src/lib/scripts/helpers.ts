/* eslint-disable @rushstack/security/no-unsafe-regexp */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from 'fs';

import { execSync } from 'child_process';

import { OriginationOperation, MavrykToolkit } from '@mavrykdynamics/webmavryk';

import { confirmOperation } from './confirmation.js';

import { networkConfig, NetworkName } from './env.js';
import * as path from 'path';
import { URL } from 'url';
import { AggregatorFactoryContractAbstraction } from '../aggregatorFactory.js';
import {
    AggregatorFactoryLambdas,
    AggregatorLambdas
} from '../aggregatorFactory.js'
import { MavenLiteContractAbstraction } from '../mavenLite.js';
export const getLigo = (
  isDockerizedLigo: boolean,
  ligoVersion: string = networkConfig.ligoVersion,
  isAppleSilicon = 'false'
): string => {
  let path = 'ligo';
  const isAppleM1 = JSON.parse(isAppleSilicon);

  if (isDockerizedLigo) {
    if (isAppleM1) {
      path = `docker run --platform=linux/amd64 -v $PWD:$PWD --rm -i mavrykdynamics/ligo:${ligoVersion}`;
    } else {
      path = `docker run -v $PWD:$PWD  --rm -i mavrykdynamics/ligo:${ligoVersion}`;
    }

    try {
      execSync(`${path}  --help`);
    } catch (err) {
      path = 'ligo';
      execSync(`${path}  --help`);
    }
  } else {
    try {
      execSync(`${path}  --help`);
    } catch (err) {
      if (isAppleM1) {
        path = `docker run --platform=linux/amd64 -v $PWD:$PWD --rm -i mavrykdynamics/ligo:next`;
      } else {
        path = `docker run -v $PWD:$PWD --rm -i mavrykdynamics/ligo:${ligoVersion}`;
      }

      execSync(`${path}  --help`);
    }
  }

  return path;
};

export const getContractsList = (): string[] => {
  return fs
    .readdirSync(networkConfig.contractsDir)
    .filter((file) => file.endsWith('.ligo'))
    .map((file) => file.slice(0, file.length - 5));
};

export const getMigrationsList = (): string[] => {
  return fs
    .readdirSync(networkConfig.migrationsDir)
    .filter((file) => file.endsWith('.ts'))
    .map((file) => file.slice(0, file.length - 3));
};

export const compile = async (
  format: string | undefined,
  contract: string | undefined = undefined,
  contractsDir: string = networkConfig.contractsDir,
  outputDir: string = networkConfig.buildDir,
  ligoVersion: string = networkConfig.ligoVersion,
  isAppleSilicon = 'false'
): Promise<void> => {
  const ligo: string = getLigo(true, ligoVersion, isAppleSilicon);
  const contracts: string[] = !contract ? getContractsList() : [contract];
  contracts.forEach((contract) => {
    const michelson: string = execSync(
      `${ligo} compile contract $PWD/${contractsDir}/${contract}.ligo ${
        format === 'json' ? '--michelson-format json' : ''
      } --protocol jakarta`,
      { maxBuffer: 1024 * 500 * 1024 }
    ).toString();

    try {
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
      }

      if (format === 'json') {
        const artifacts: string = JSON.stringify(
          {
            contractName: contract,
            michelson: JSON.parse(michelson),
            networks: {},
            compiler: {
              name: 'ligo',
              version: ligoVersion
            },
            networkType: 'mavryk'
          },
          null,
          2
        );

        fs.writeFileSync(`${outputDir}/${contract}.json`, artifacts);
      } else {
        fs.writeFileSync(`${outputDir}/${contract}.tz`, michelson);
      }
    } catch (e) {
      console.dir(e, {depth: 5});
    }
  });
};

export const compileLambdas = async (
  json: string | undefined,
  contract: string | undefined,
  ligoVersion: string = networkConfig.ligoVersion
): Promise<void> => {
  const ligo: string = getLigo(true, ligoVersion);
  const pwd: string = execSync('echo $PWD').toString();
  const lambdas: any = JSON.parse(fs.readFileSync(`${pwd.slice(0, pwd.length - 1)}/${json}`).toString());
  const res: any[] = [];

  try {
    for (const lambda of lambdas) {
      const michelson = execSync(
        `${ligo} compile expression pascaligo 'Bytes.pack(${lambda.name})' --michelson-format json --init-file $PWD/${contract} --protocol jakarta`,
        { maxBuffer: 1024 * 500 }
      ).toString();

      res.push(JSON.parse(michelson).bytes);

      console.log(lambda.index + 1 + '. ' + lambda.name + ' successfully compiled.');
    }

    if (!fs.existsSync(`${networkConfig.buildDir}/lambdas`)) {
      fs.mkdirSync(`${networkConfig.buildDir}/lambdas`);
    }

    fs.writeFileSync(`${networkConfig.buildDir}/lambdas/governanceLambdas.json`, JSON.stringify(res));
  } catch (e) {
    console.log('error in compiling lambdas');
    console.dir(e, {depth: 5});
  }
};

export const compileParameters = async (
  json: string | undefined,
  contract: string | undefined,
  ligoVersion: string = networkConfig.ligoVersion
): Promise<void> => {
  const ligo: string = getLigo(true, ligoVersion);
  const pwd: string = execSync('echo $PWD').toString();
  const lambdaParams: any = JSON.parse(fs.readFileSync(`${pwd.slice(0, pwd.length - 1)}/${json}`).toString());
  const res: any[] = [];

  try {
    for (const lambdaParam of lambdaParams) {
      const michelson = execSync(
        `${ligo} compile parameter $PWD/${contract} '${lambdaParam.action}' --entry-point main --michelson-format json --syntax pascaligo --protocol jakarta`,
        { maxBuffer: 1024 * 500 }
      ).toString();

      res.push(JSON.parse(michelson));

      console.log(lambdaParam.index + 1 + '. ' + lambdaParam.name + ' lambda successfully compiled.');
    }

    if (!fs.existsSync(`${networkConfig.buildDir}/lambdas`)) {
      fs.mkdirSync(`${networkConfig.buildDir}/lambdas`);
    }

    fs.writeFileSync(
      `${networkConfig.buildDir}/lambdas/governanceLambdaParameters.json`,
      JSON.stringify(res)
    );
  } catch (e) {
    console.log('error in compiling lambda parameters');
    console.dir(e, {depth: 5});
  }
};

export const migrate = async (
  mavryk: MavrykToolkit,
  contract: string,
  storage: any
): Promise<string | undefined> => {
  try {
    console.log(`${networkConfig.buildDir}/${contract}.json`);

    const artifacts: any = JSON.parse(
      fs.readFileSync(`${networkConfig.buildDir}/${contract}.json`).toString()
    );

    // console.log('running migrations')
    // console.log(mavryk)
    // console.log('artifacts')
    // console.log(artifacts)

    const operation: OriginationOperation = await mavryk.contract.originate({
      code: artifacts.michelson,
      storage: storage
    });
    //      .catch((e) => {
    //        console.dir(e, {depth: 5})
    //
    //        return null
    //      })

    console.log('show operation');
    console.log(operation);

    await confirmOperation(mavryk, operation.hash);

    artifacts.networks[networkConfig.network] = {
      [contract]: operation.contractAddress
    };

    if (!fs.existsSync(networkConfig.buildDir)) {
      fs.mkdirSync(networkConfig.buildDir);
    }

    fs.writeFileSync(`${networkConfig.buildDir}/${contract}.json`, JSON.stringify(artifacts, null, 2));

    return operation.contractAddress;
  } catch (e) {
    console.dir(e, {depth: 5});
    return undefined;
  }
};

export const getDeployedAddress = (contract: string): any => {
  try {
    const artifacts: any = JSON.parse(
      fs.readFileSync(`${networkConfig.buildDir}/${contract}.json`).toString()
    );

    return artifacts.networks[networkConfig.network][contract];
  } catch (e) {
    console.dir(e, {depth: 5});
  }
};

export const runMigrations = async (
  from = 0,
  to: number = getMigrationsList().length,
  network: NetworkName = 'development'
): Promise<void> => {
  try {
    const migrations: string[] = getMigrationsList();

    for (let i: number = from; i < to; ++i) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const execMigration: any = await import(`../../../${networkConfig.migrationsDir}/${migrations[i]}.js`);

      await execMigration.default(networkConfig, network);
    }
  } catch (e) {
    console.dir(e, {depth: 5});
  }
};

export const saveContractAddress = async (
  contractName: string,
  address: string,
  networkName: NetworkName = 'development'
): Promise<void> => {
  const filePath =
    networkName === 'development' ? '../../../../../.env' : `../../../../../.${networkName}.env`;

  const dirname = new URL('.', import.meta.url).pathname;
  const envFile = path.resolve(dirname, filePath);
  let data = fs.readFileSync(envFile, 'utf8');

  const present = data.match(new RegExp(`^${contractName}=.*$`, 'm'));

  if (present === null) {
    data += `\n${contractName}=${address}\n`;
  } else {
    data = data.replace(new RegExp(`^${contractName}=.*$`, 'm'), `${contractName}=${address}`);
  }

  fs.writeFileSync(envFile, data, 'utf8');
};

export const setAggregatorFactoryLambdas = async (
    mavrykToolkit: MavrykToolkit,
    aggregatorFactory: AggregatorFactoryContractAbstraction,
): Promise<void> => {
    const lambdasPerBatch   = 10;
    const lambdas           = AggregatorFactoryLambdas;
    const lambdasCount      = Object.keys(lambdas).length;
    const batchesCount      = Math.ceil(lambdasCount / lambdasPerBatch);

    for(let i = 0; i < batchesCount; i++) {
        
        const batch = mavrykToolkit.wallet.batch();
        let index   = 0;

        for (const lambdaName in lambdas) {
            if (lambdaName){
                const bytes   = lambdas[lambdaName]
                if(index < (lambdasPerBatch * (i + 1)) && (index >= lambdasPerBatch * i)){
                    batch.withContractCall(aggregatorFactory.methods.setLambda(lambdaName, bytes))
                }
                index++;
            }
        }

        const setupLambdasOperation = await batch.send()
        await confirmOperation(mavrykToolkit, setupLambdasOperation.opHash);
    }
};

export const setAggregatorFactoryProductLambdas = async (
    mavrykToolkit: MavrykToolkit,
    aggregatorFactory: AggregatorFactoryContractAbstraction,
): Promise<void> => {
    const lambdasPerBatch   = 10;
    const lambdas           = AggregatorLambdas;
    const lambdasCount      = Object.keys(lambdas).length;
    const batchesCount      = Math.ceil(lambdasCount / lambdasPerBatch);

    for(let i = 0; i < batchesCount; i++) {
        
        const batch = mavrykToolkit.wallet.batch();
        let index   = 0;

        for (const lambdaName in lambdas) {
            if (lambdaName){
                const bytes   = lambdas[lambdaName]
                if(index < (lambdasPerBatch * (i + 1)) && (index >= lambdasPerBatch * i)){
                    batch.withContractCall(aggregatorFactory.methods.setProductLambda(lambdaName, bytes))
                }
                index++;
            }
        }

        const setupProductLambdasOperation = await batch.send()
        await confirmOperation(mavrykToolkit, setupProductLambdasOperation.opHash);
    }
};

export const setMavenLiteGeneralContracts = async (
    mavrykToolkit: MavrykToolkit,
    mavenLite: MavenLiteContractAbstraction,
): Promise<void> => {
    const generalContractsBatch = mavrykToolkit.wallet.batch()
    .withContractCall(mavenLite.methods.updateGeneralContracts("aggregatorTreasury", mavenLite.address, "update"))
    .withContractCall(mavenLite.methods.updateGeneralContracts("delegation", mavenLite.address, "update"))
    .withContractCall(mavenLite.methods.updateGeneralContracts("governanceSatellite", mavenLite.address, "update"))
    const generalContractsOperation = await generalContractsBatch.send()
    await confirmOperation(mavrykToolkit, generalContractsOperation.opHash);
};
