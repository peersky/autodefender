import {getProcessEnv, getSlackNotifyChannel} from './src/utils';
const polygonRPC = getProcessEnv(false, 'POLYGON_RPC_URL');
const mainnerRPC = getProcessEnv(false, 'MAINNET_RPC_URL');
import {DefenderConfigType} from './src/types';
import {generateOwnableMonitor} from './src/templates/monitors/ownership';
import {all} from './src/templates/matchers/all';
import {getDeployments} from './src/githubFetch';
const config: DefenderConfigType = {
  projectName: 'WORKSHOP1',
  ssot: false,
  // path: 'https://api.github.com/repos/thesandboxgame/sandbox-smart-contracts/contents/packages/core/deployments',
  // getter: getDeployments,
  path: './deployments',
  networks: {
    matic: {rpc: polygonRPC, directoryName: 'polygon'},
    mainnet: {rpc: mainnerRPC, directoryName: 'mainnet'},
  },
  monitors: {
    Ownership: {
      filter: all(undefined, 2),
      monitor: generateOwnableMonitor(),
      notification: (info) => {
        return {
          channels: [
            getSlackNotifyChannel(
              getProcessEnv(false, `SLACK_URL_${info.name}_${info.network}`),
              `Ownership Slack ${info.name} ${info.network}`
            ),
          ],
        };
      },
    },
    // 'Large-Mint-ERC1155': {
    //   notification: {
    //     channels: [getSlackNotifyChannel(getProcessEnv(false, 'SLACK_URL'))],
    //   },
    //   filter: findContractsWithInterface(erc1155abi),
    //   monitor: mintMonitor('ERC1155', '10'),
    // },
    // 'Large-Mint-ERC20': {
    //   notification: {
    //     channels: [getSlackNotifyChannel(getProcessEnv(false, 'SLACK_URL'))],
    //   },
    //   filter: findERC20Contracts(),
    //   monitor: mintMonitor('ERC20', '100'),
    // },
    // 'Large-Mint-ERC721': {
    //   notification: {
    //     channels: [getSlackNotifyChannel(getProcessEnv(false, 'SLACK_URL'))],
    //   },
    //   filter: findContractsWithInterface(erc721abi),
    //   monitor: mintMonitor('ERC721', '100'),
    // },
    // 'attack-detector': {
    //   notification: {
    //     channels: [getSlackNotifyChannel(getProcessEnv(false, 'SLACK_URL'))],
    //   },
    //   monitor: attackDetectorMonitor(),
    //   filter: all(),
    // },
    // Proxies: {
    //   notification: {
    //     channels: [getSlackNotifyChannel(getProcessEnv(false, 'SLACK_URL'))],
    //   },
    //   monitor: upgradesMonitor(),
    //   filter: all(),
    // },
    // AccessControl: {
    //   notification: {
    //     channels: [getSlackNotifyChannel(getProcessEnv(false, 'SLACK_URL'))],
    //   },
    //   monitor: accessMonitor(),
    //   filter: findContractsWithInterfaces([
    //     AccessContolAbi,
    //     AccessControlDefaultAdminAbi,
    //   ]),
    // },
  },

  outDir: './out',
  // extractedAccountsMonitoring: {
  //   EthBalance: {
  //     monitor: accountEthMonitor('10'),
  //     filter: all(),
  //     notification: {
  //       channels: [getSlackNotifyChannel(getProcessEnv(false, 'SLACK_URL'))],
  //     },
  //   },
  // LogActions: {
  //   monitor: accountActivityMonitor('10'),
  //   filterAccounts: (c) => Promise.resolve(c),
  // },
  // },
  excludeDeployments: [
    'QUICKSWAP_SAND_MATIC',
    'FXCHILD*',
    'CHILD_CHAIN_MANAGER',
    '*_Implementation',
    '*_Proxy',
    'TRUSTED_FORWARDER',
    'PolygonLand_V1',
    'FAKE*',
    'DAIMedianize',
    'DAI',
    'WrappedEther',
    'Old_*',
  ],
  excludeAccounts: ['0x000000000000AAeB6D7670E522A718067333cd4E'],
};
export default config;
module.exports = config;
