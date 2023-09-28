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
      filter: findERC20Contracts(), //see availible matchers in src/templates/matchers
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

## Creating new templates

Create new file in `/templates/`. Add it to index.

Follow typing definitions of `DefenderConfigType`

### Matchers

Matchers are the templates intended to take some given address space, provider already connected to network and any extra arguments, and it must return array of `MatcherFindings`. Each finding has `address` of finding and `relatedAccounts[]` array (i.e. roles in AccessControl contracts)

### Monitors

These findings from Matcher function, and generate a monitoring template that consists of Monitor itself and dependencies, if required, such as (trigger/condition) Functions or Relayers that must be connected in order for monitor to work

#### Triggers and Conditions

##### Defining function template

Functions are javascript templates that are ready to be deployed in Defender scripts. They are intended to run in the Defender Node enviroment and therefore best practice is to rollup or use webpack to genetrate them.

Convinient development way is to create your template in `src/templates` directory and then add it to the build process in `rollup.config.js`. Then by simply running `yarn build:functions` your function will be added to `templates/functions`.

##### Using scoped secrets

If you need to pass some argument from the configuration down to autotask, this is possible to do with scoped secrets defined in `src/templates/utils`

Scoped secrets use secret name and function visible name to combine it to a secret key that can be red from enviroment.

##### Adding to monitor

Simply add in your templates `newMonitor` properties: `autotask-condition` or `autotask-trigger` with path from repo root to compiled template.

##### Adding relays

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

##### Specifying secrets

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

#### Standalone functions

Are not yet supported but it's easy to implement. Add your PR ;)
