#!/usr/bin/env node
const yargs = require('yargs/yargs');
const {hideBin} = require('yargs/helpers');
const fs = require('fs');
const {contractsFormatter} = require('./generators/contracts');
const {getDeployments} = require('./githubFetch');
const {monitorsGenerator} = require('./generators/monitors/ownable');

const {spawn} = require('child_process');
//Short code

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
    'fromHHDeploy',
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
      console.log('outdir,', config.outDir);
      fs.writeFileSync(
        `${config.outDir}/contracts.json`,
        contractsFormatter(deploymentRecords)
      );
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

      // const child = spawn('sls', [
      //   'deploy',
      //   '--stage',
      //   'dev',
      //   '--config',
      //   'contracts.ts',
      // ]);
      child.stdout.on('data', (data) => {
        console.log(
          data.toString().startsWith(`{
          "stack": "contracts_WORKSHOP1",`)
        );
        process.stdout.write(data);
      });

      child.stderr.on('data', (data) => {
        process.stdout.write(data);
      });

      // child.on('close', (code) => {
      //   console.log(`child process exited with code ${code}`);
      // });

      // const resultFile = ts.createSourceFile(
      //   'contracts.ts',
      //   '',
      //   ts.ScriptTarget.Latest,
      //   /*setParentNodes*/ false,
      //   ts.ScriptKind.TS
      // );
      // const printer = ts.createPrinter({
      //   newLine: ts.NewLineKind.LineFeed,
      // });
      // const result = printer.printNode(
      //   ts.EmitHint.Unspecified,
      //   makeContractsArray(),
      //   resultFile
      // );

      //   const wallet = ethers.Wallet.createRandom();
      //   console.log('************MNEMONIC**************');
      //   console.log(wallet.mnemonic);
      //   for (let i = 0; i < argv.depth; i++) {
      //     const walletIdx = ethers.Wallet.fromMnemonic(
      //       wallet.mnemonic.phrase,
      //       `m/44'/60'/0'/0/${i}`
      //     );
      //     console.log(walletIdx.address);
      //   }
      //   console.log('**********************************');
    }
  )
  .parse();
