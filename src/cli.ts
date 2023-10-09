#!/usr/bin/env node
import yargs from 'yargs/yargs';
import {hideBin} from 'yargs/helpers';
import fs from 'fs';
import {contractsFormatter} from './generators/contracts';
import {getDeployments} from './githubFetch';
import {monitorsGenerator} from './generators/monitors';
import _ from 'lodash';
import {spawn} from 'child_process';
import {matches, parseAbi} from './utils';
import path from 'path';
import {DefenderConfigType} from './types';
const extension = process.env.TS_NODE ? 'ts' : 'js';
const getDirectories = async (source: string) =>
  fs
    .readdirSync(source, {withFileTypes: true})
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
const getFiles = async (source: string) =>
  fs
    .readdirSync(source, {withFileTypes: true})
    .filter((dirent) => !dirent.isDirectory());

const getRecords = async (config: DefenderConfigType) => {
  let r = [];
  let numNets = 0;
  if (!config.getter) {
    if (config.path.startsWith('http')) {
      r = await getDeployments(config);
    } else {
      const networkDirectories = await getDirectories(config.path);
      console.log('Fetching from... ', config.path);
      for (const networkDir of networkDirectories) {
        if (!config.networks) throw new Error('No config.networks found');
        const nKey = Object.keys(config.networks).find(
          (_nkey: any) =>
            _nkey === networkDir ||
            //@ts-expect-error later fix
            (config.networks[_nkey]?.directoryName &&
              //@ts-expect-error later fix
              networkDir === config.networks[_nkey].directoryName)
        );
        if (nKey) {
          numNets += 1;
          const p = config.path + '/' + networkDir;
          const networkDeploymentFiles = await getFiles(p);
          for (const deploymentFile of networkDeploymentFiles) {
            if (
              !matches(deploymentFile.name, config.excludeDeployments) &&
              deploymentFile.name !== '.chainId' &&
              deploymentFile.name !== '.migrations.json'
            ) {
              const file = JSON.parse(
                fs.readFileSync(p + '/' + deploymentFile.name).toString()
              );

              const rec = {
                name: deploymentFile.name.replace(/\.[^/.]+$/, ''),
                abi: file.abi ? parseAbi(file.abi) : [],
                network: nKey,
                address: file.address,
              };
              r.push(rec);
            }
          }
        }
      }
    }
    console.log(
      'Found ',
      r.length,
      'addresses in directory across',
      numNets,
      ' networks'
    );
  } else {
    r = await config.getter(config);
    const result = _.countBy(r, (x) => x.network);
    console.log('Using custom parser found ', r.length, 'records:', result);
  }

  return r;
};

yargs(hideBin(process.argv))
  .command(
    'contracts',
    'Creates from hardhat deployment artifacts',
    (yargs) => {
      return yargs
        .positional('config', {
          describe: 'Path to configuration file',
          type: 'string',
        })
        .demandOption(['config']);
    },
    async (argv) => {
      console.log('Contracts');
      const cPath = path.join(process.cwd(), argv.config);
      const config = await import(cPath);
      if (!config) throw new Error(`Config file not found in path ${cPath}`);
      const deploymentRecords = await getRecords(config);

      try {
        fs.mkdirSync(config.outDir);
      } catch (e) {
        //
      }
      console.log(
        'path',
        path.join(process.cwd(), config.outDir, 'contracts.json'),
        'dirname',
        __dirname
      );
      fs.writeFileSync(
        path.join(process.cwd(), config.outDir, 'contracts.json'),
        contractsFormatter(deploymentRecords)
      );

      const child = spawn(
        'sls',
        ['deploy', '--stage', 'dev', '--config', `contracts.${extension}`],
        {
          cwd: __dirname,
          env: {
            ...process.env,
            AUTODEFENDER_CONFIG_PATH: argv.config,
            AUTODEFENDER_CLI_CWD: process.cwd(),
          },
        }
        // {stdio: [stdin, 'pipe', 'pipe'], encoding: 'utf8', shell: true}
      );
      child.stdout.pipe(process.stdout);
      child.stderr.pipe(process.stderr);
      process.stdin.pipe(child.stdin);
      // child.stdout.on('data', (data) => {
      //   // if (!data.toString().length < 500)
      //   process.stdout.write(data);
      // });
    }
  )
  .command(
    'monitors',
    'Creates from hardhat deployment artifacts',
    (yargs) => {
      return yargs
        .positional('config', {
          describe: 'Path to configuration file',
          type: 'string',
        })
        .demandOption(['config']);
    },
    async (argv) => {
      const cPath = path.join(process.cwd(), argv.config);
      const config = await import(cPath);
      if (!config) throw new Error(`Config file not found in path ${cPath}`);
      const deploymentRecords = await getRecords(config);

      try {
        fs.mkdirSync(config.outDir);
      } catch (e) {
        //
      }
      if (deploymentRecords.length > 0) {
        const monitors = await monitorsGenerator(deploymentRecords, config);
        fs.writeFileSync(
          path.join(process.cwd(), config.outDir, 'monitors.json'),
          JSON.stringify(monitors, null, 4)
        );
        console.log('__dirname', __dirname);

        const child = spawn(
          'sls',
          ['deploy', '--stage', 'dev', '--config', `monitors.${extension}`],
          // {stdio: 'overlapped'}
          {
            serialization: 'advanced',
            cwd: __dirname,
            env: {
              ...process.env,
              AUTODEFENDER_CONFIG_PATH: argv.config,
              AUTODEFENDER_CLI_CWD: process.cwd(),
            },
          }
        );
        // child.sti;
        child.stdout.pipe(process.stdout);
        child.stderr.pipe(process.stderr);
        process.stdin.pipe(child.stdin);
        // child.stdio;
        // child.stdout.on('data', (data) => {
        //   if (data.toString().length < 512) process.stdout.write(data);
        // });
      }
    }
  )
  .parse();
