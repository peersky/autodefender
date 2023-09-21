#!/usr/bin/env node
const yargs = require('yargs/yargs');
const {hideBin} = require('yargs/helpers');
const fs = require('fs');
const {contractsFormatter} = require('./generators/contracts');
const {getDeployments} = require('./githubFetch');
const {monitorsGenerator} = require('./generators/monitors');

const {spawn} = require('child_process');

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
    'fromHHDeployContracts',
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
      const config = require(argv.config);
      let deploymentRecords = [];
      if (config.path.startsWith('http')) {
        deploymentRecords = await getDeployments(config);
      }
      try {
        fs.mkdirSync(config.outDir);
      } catch (e) {
        //
      }
      fs.writeFileSync(
        `${config.outDir}/contracts.json`,
        contractsFormatter(deploymentRecords)
      );

      const child = spawn('sls', [
        'deploy',
        '--stage',
        'dev',
        '--config',
        'contracts.ts',
      ]);
      child.stdout.on('data', (data) => {
        if (!data.toString().startsWith(`{`) || !data.toString().length < 200)
          process.stdout.write(data);
      });
    }
  )
  .command(
    'fromHHDeployMonitors',
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
      const config = require(argv.config);
      let deploymentRecords = [];
      if (config.path.startsWith('http')) {
        deploymentRecords = await getDeployments(config);
      }
      try {
        fs.mkdirSync(config.outDir);
      } catch (e) {
        //
      }

      const monitors = await monitorsGenerator(deploymentRecords, config);
      fs.writeFileSync(
        `${config.outDir}/monitors.json`,
        JSON.stringify(monitors, null, 4)
      );

      const child = spawn('sls', [
        'deploy',
        '--stage',
        'dev',
        '--config',
        'monitors.ts',
      ]);

      child.stdout.on('data', (data) => {
        if (!data.toString().startsWith(`{`) || data.toString().length < 100)
          process.stdout.write(data);
      });
    }
  )
  .parse();
