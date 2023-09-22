# Plug-in-templates for Defender as Code

This repository contains templates and tooling to setup web3 monitoring on [OpenZeppelin Defender](https://defender.openzeppelin.com) without hassle.

Structure of this codebase is made with plug-in-ability in mind, so adding new templates is very easy as well!

Here is what you will be able to configure:

- What monitoring to setup
- Scope for contracts to cover with monitoring
- How to determine which contracts should be monitored in each particular template
- Where to send notifications

### Setting up:

Run

```
yarn && yarn types
```

Open or create new `defender.config.ts` in root of this repository.

```ts
{
  projectName: '', //StackName
  path: // url or path to directory that contains /<network>/<contractName>.json. File must contain {abi, address} properties.
  networks: { // these are needded for matchers that require web3 connection
    matic: {rpc: polygonRPC, directoryName: 'polygon'}, // RPC URL and directory names in path ^^
    mainnet: {rpc: mainnerRPC, directoryName: 'mainnet'},
  },
  monitors: {
    'Large-Mint-ERC20': { //Custom name, create as amany as you like
      notification: { // Notifyconfig
        channels: [getSlackNotifyChannel(getProcessEnv(false, 'SLACK_URL'))], //availible getters in /src/templates/notifications
      },
      contractsFilter: findERC20Contracts(), //see availible matchers in src/templates/matchers
      monitor: mintMonitor('ERC20', '100'), //see availible monitors in src/templates/monitors
      //ToDo: Add trigger templates here
    },
  },
  outDir: './out', //Directory where serverless resources will be generated.
  accounts: {  //This is WIP. Will be adding ability to extract and monitor for all priv. accounts soon
    logActions: true, //Log any transactions
    lowOnGasThreshold: '1', //Notify if account gas threshold is below set value
  },
  excludeDeployments: [ //Exclude glob pattern files from path
    'QUICKSWAP_SAND_MATIC',
    'FXCHILD*',
    'CHILD_CHAIN_MANAGER',
    '*_Implementation',
    '*_Proxy',
    'TRUSTED_FORWARDER',
    'PolygonLand_V1',
    'FAKE*',
    'DAIMedianize',
  ],
  excludeAccounts: ['0x000000000000AAeB6D7670E522A718067333cd4E'], //Exclude accounts from all monitoring
};
```

## Generating & Deploying

### Export env variables

```
export DEFENDER_SECRET = ""
export DEFENDER_KEY = ""
export POLYGON_RPC_URL="url"
export SLACK_URL="url"
export MAINNET_RPC_URL="url"

```

```
yarn contracts
yarn monitors
```

## Adding new templates

Create new file in `/templates/`. Add it to index.

Follow typing definitions of `DefenderConfigType`

Make PR ;)
