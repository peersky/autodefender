# Plug-in-templates for Defender as Code

This repository contains templates and tooling to setup web3 monitoring on [OpenZeppelin Defender](https://defender.openzeppelin.com) without hassle.

Structure of this codebase is made with plug-in-ability in mind, so adding new templates is very easy as well!

## Why use it?

- Generate monitoring configuration with current on-chain data as source of truth
- Manage only one configuration file and reuse code with use of templates
- Combine matchiing logic templates with monitoring templates to get what you need.
- Run this in CI/CD pipeline to automatically keep up to date with any new deployments
- Typescript support for configuring Defender

### Installing and using as package

```
pnpm add autodefender
```

or

```
yarn add autodefender
```

then create config file `defender.config.js`:

```js
const {getProcessEnv, getSlackNotifyChannel} = require('autodefender/utils');
const polygonRPC = getProcessEnv(false, 'POLYGON_RPC_URL');
const mainnerRPC = getProcessEnv(false, 'MAINNET_RPC_URL');
const {
  generateOwnableMonitor,
} = require('autodefender/templates/monitors/ownership');
const {all} = require('autodefender/templates/matchers/all');

/** @type import('autodefender/src/types').DefenderConfigType */
const config = {
  projectName: 'WORKSHOP1',
  ssot: false,
  // path: 'https://api.github.com/repos/thesandboxgame/sandbox-smart-contracts/contents/packages/core/deployments',
  path: './deployments',
  networks: {
    matic: {rpc: polygonRPC, directoryName: 'polygon'},
    mainnet: {rpc: mainnerRPC, directoryName: 'mainnet'},
  },
  monitors: {
    Ownership: {
      filter: all(),
      monitor: generateOwnableMonitor(),
      notification: {
        channels: [getSlackNotifyChannel(getProcessEnv(false, 'SLACK_URL'))],
      },
    },
  },
  outDir: './out',
  extractedAccountsMonitoring: {},
  excludeDeployments: ['Old_*'],
  excludeAccounts: ['0x000000000000AAeB6D7670E522A718067333cd4E'],
};
module.exports = config;
```

To deploy contracts:

```
yarn autodefender contracts --config defender.config.js
```

To deploy monitors:

```
yarn autodefender monitors --config defender.config.js
```

### Setting up dev enviroment:

Run

```
pnpm install && pnpm types
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
      filter: findERC20Contracts(), //see availible matchers in src/templates/matchers
      monitor: mintMonitor('ERC20', '100'), //see availible monitors in src/templates/monitors
      //ToDo: Add trigger templates here
    },
  },
  outDir: './out', //Directory where serverless resources will be generated in form of json files. You don't need to commit these, but if you want to work with typescript-serverless bypassing this config file - you can use those output files.
  extractedAccountsMonitoring: { //These are same as monitors, but the addres space supplied to them is a union of all relatedAccounts that all matchers of monitors have found. Use this to setup monitoring over owner accounts, admins etc.
    EthBalance: {
      monitor: accountEthMonitor('10'),
      filter: all(), //Use additional filtering to narrow down address space for priveledged accounts in particular template
      notification: {
        channels: [getSlackNotifyChannel(getProcessEnv(false, 'SLACK_URL'))],
      },
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

NB: Im not a fun of using dotenv. Use `export` keyword in env files/variables and `source <your_env_file>` or add sorucing to yarn commands, or add dotenv if you like using it.

```
yarn contracts
yarn monitors
```

## Kinds of Templates

Create new file in `/templates/`. Add it to index.

Follow typing definitions of `DefenderConfigType`

### Matchers

Matchers are the templates intended to take some given address space, provider already connected to network and any extra arguments, and it must return array of `MatcherFindings`. Each finding has `address` of finding and `relatedAccounts[]` array (i.e. roles in AccessControl contracts)

### Monitors

Findings from Matcher function are passed to Monitor Getter template along with other arguments and generate a monitoring template that consists of Monitor itself, and optional dependencies.
Dependencies might be: (trigger/condition) Functions, connected to them Relayers and Secrets.

### Messages

md files that must be parsed in to strings and be returned from Monitor template

### Notifications

Templates to generate `YNotification`

### Functions

Functions are javascript templates that are ready to be deployed in Defender scripts. They are intended to run in the Defender Node enviroment and therefore best practice is to rollup or use webpack to genetrate them.

Convinient development way is to create your template in `src/templates` directory and then add it to the build process in `rollup.config.js`. Then by simply running `yarn prebuild` your function will be added to `templates/functions`.

## Creating a new monitor

### Monitor getter

Monitor getters are described by

```ts
TSentinelGetter<Record<string, string | never>, Record<string, string | never>>;
```

where inputs are

```ts
contractAddresses: string[]// - array of addresses to monitor for
provider: JsonRpcProvider // For convinience of reading chain during generation you have provider availible (running on future monitors network)
networkName: Network //Network name in Defender naming convention
```

and return is Promise of `TSentinelOutput` which consists of

```ts
export interface TSentinelOutput<T, K> {
  newMonitor: TSentinel; //Template for the monitor
  defaultMessage: string; //Default message to send as notificaiton
  actionsParams?: ActionsParams<T, K>; //Extra parameters such as secrets or relay definitions
}
```

### Adding functions

Simply add in your templates `newMonitor` properties: `autotask-condition` or `autotask-trigger` with path from repo root to compiled template.

#### Connecting functions to relays

If your functions require relay to operate you can use either default relay for read operations generated automatically, or specify key for custom relay. In second case you must specify relay configuration in your config file with same key.

To add relay return object must contain `actionsParams` object. I.e. connecting to default relay in same network as Monitor is run for conditional autotask may look like this:

```ts
return {
  //Return object from monitor template
  newMonitor, //Monitor object itself
  defaultMessage, //Notification message (string)
  actionsParams: {
    condition: {
      relayNetwork: sentinelNetwork, //Specifying relayNetwork will automatically add default_reader relay on that network
      customRelay: 'myRelayer', //Adding this will use your custom defined relayer from config file instead of default
    },
    trigger: trigger //if trigger is defined it will require relay in trigger autotask.
      ? {relayNetwork: trigger.params.relayNetwork, secrets: trigger.params}
      : undefined,
  },
};
```

### Specifying secrets

In the example above, monitoring template actually requires `LOW_ETH_THRESHOLD` secret to exist in Defender stack. In order to add id, pass required key-values as `actionsParams.condition` or `actionsParams.trigger`. Having trigger/conditon differentiator will allow that secret to be used in scoped secrets workflow

```ts
return {
  newMonitor,
  defaultMessage,
  actionsParams: {
    condition: {
      relayNetwork: sentinelNetwork,
      secrets: {LOW_ETH_THRESHOLD: threshold}, //This is custom parameter that autotask needs to consume from secrets
      customRelay: 'myRelayer',
    },
    trigger: trigger
      ? {relayNetwork: trigger.params.relayNetwork, secrets: trigger.params}
      : undefined,
  },
};
```

#### Using scoped secrets

If you need to pass some argument from the configuration to function, this is possible to do with scoped secrets defined in `src/templates/utils`

Scoped secrets use secret name and function visible name to combine it to a secret key that can be red from enviroment.

## Function getter

Are not yet supported but it's easy to implement. Add your PR ;)

```

```
