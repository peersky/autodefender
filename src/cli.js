#!/usr/bin/env ts-node
const yargs = require('yargs/yargs');
const {hideBin} = require('yargs/helpers');
const fs = require('fs');
const {contractsFormatter} = require('./generators/contracts');
const {getDeployments} = require('./githubFetch');
const {monitorsGenerator} = require('./generators/monitors');

const {spawn} = require('child_process');
const {matches, parseAbi} = require('./utils');
const path = require('path');

const getDirectories = async (source) =>
  fs
    .readdirSync(source, {withFileTypes: true})
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
const getFiles = async (source) =>
  fs
    .readdirSync(source, {withFileTypes: true})
    .filter((dirent) => !dirent.isDirectory());

const getRecords = async (config) => {
  let r = [];
  let numNets = 0;
  if (config.path.startsWith('http')) {
    r = await getDeployments(config);
  } else {
    const networkDirectories = await getDirectories(config.path);
    console.log('Fetching from... ', config.path);
    for (const networkDir of networkDirectories) {
      const nKey = Object.keys(config.networks).find(
        (_nkey) =>
          _nkey === networkDir ||
          (config.networks[_nkey].directoryName &&
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
              fs.readFileSync(p + '/' + deploymentFile.name)
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
  return r;
};

/** @dev
 *  ******HARDHAT DEPLOY SCENARIO***************
 * - Fetch data from hardhhat deployments
 *  --config path to defender.config.json
 * - Extract address list by network
 *  --networks matic, mumbai, etc ()
 * - For each supported network get contract ABI's
 * - Get ABI's
 * - If ABI -> create defender contract resource
 * -
 */
yargs(hideBin(process.argv))
  .command(
    'contracts',
    'Creates from hardhat deployment artifacts',
    (yargs) => {
      return yargs
        .positional('in', {
          describe: 'path where deployments folder resides',
          // default: 10,
        })
        .positional('config', {describe: 'Path to configuration file'});
    },
    async (argv) => {
      const config = require(path.join(process.cwd(), argv.config));
      let deploymentRecords = await getRecords(config);

      try {
        fs.mkdirSync(config.outDir);
      } catch (e) {
        //
      }
      console.log(
        'asadadadad',
        path.join(process.cwd(), config.outDir, 'contracts.json')
      );
      fs.writeFileSync(
        path.join(process.cwd(), config.outDir, 'contracts.json'),
        contractsFormatter(deploymentRecords)
      );

      const child = spawn(
        'sls',
        ['deploy', '--stage', 'dev', '--config', 'contracts.ts'],
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
      // child.stdout.pipe(process.stdout);
      // child.stderr.pipe(process.stderr);
      process.stdin.pipe(child.stdin);
      child.stdout.on('data', (data) => {
        // if (!data.toString().length < 500)
        process.stdout.write(data);
      });
    }
  )
  .command(
    'monitors',
    'Creates from hardhat deployment artifacts',
    (yargs) => {
      return yargs
        .positional('in', {
          describe: 'path where deployments folder resides',
          // default: 10,
        })
        .positional('config', {describe: 'Path to configuration file'});
    },
    async (argv) => {
      const config = require(path.join(process.cwd(), argv.config));
      let deploymentRecords = await getRecords(config);

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
          ['deploy', '--stage', 'dev', '--config', 'monitors.ts'],
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
        // child.stdout.pipe(process.stdout);
        // child.stderr.pipe(process.stderr);
        process.stdin.pipe(child.stdin);
        // child.stdio;
        child.stdout.on('data', (data) => {
          if (data.toString().length < 512) process.stdout.write(data);
        });
      }
    }
  )
  .parse();
