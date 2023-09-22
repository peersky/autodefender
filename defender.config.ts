import {getProcessEnv, getSlackNotifyChannel} from './src/utils';
const polygonRPC = getProcessEnv(false, 'POLYGON_RPC_URL');
const mainnerRPC = getProcessEnv(false, 'MAINNET_RPC_URL');
import erc1155abi from './abis/IERC1155.json';
import erc721abi from './abis/IERC721.json';
import AccessControlDefaultAdminAbi from './abis/IAccessControlDefaultAdminRules.json';
import AccessContolAbi from './abis/IAccessControl.json';
import {DefenderConfigType} from './src/types/index';
import {findAllOwnable} from './src/templates/matchers/ownable';
import {generateOwnableMonitor} from './src/templates/monitors/ownership';
import {mintMonitor} from './src/templates/monitors/minting';
import {attackDetectorMonitor} from './src/templates/monitors/attackDetector';
import {upgradesMonitor} from './src/templates/monitors/upgrades';
import {
  findContractsWithInterface,
  findContractsWithInterfaces,
} from './src/templates/matchers/interface';
import {accessMonitor} from './src/templates/monitors/accessControl';
import {findERC20Contracts} from './src/templates/matchers/erc20';
const config: DefenderConfigType = {
  projectName: 'WORKSHOP1',
  // path: 'https://api.github.com/repos/thesandboxgame/sandbox-smart-contracts/contents/packages/core/deployments',
  path: './deployments',
  networks: {
    matic: {rpc: polygonRPC, directoryName: 'polygon'},
    mainnet: {rpc: mainnerRPC, directoryName: 'mainnet'},
  },
  monitors: {
    Ownership: {
      contractsFilter: findAllOwnable(),
      monitor: generateOwnableMonitor(),
      notification: {
        channels: [getSlackNotifyChannel(getProcessEnv(false, 'SLACK_URL'))],
      },
    },
    'Large-Mint-ERC1155': {
      notification: {
        channels: [getSlackNotifyChannel(getProcessEnv(false, 'SLACK_URL'))],
      },
      contractsFilter: findContractsWithInterface(erc1155abi),
      monitor: mintMonitor('ERC1155', '10'),
    },
    'Large-Mint-ERC20': {
      notification: {
        channels: [getSlackNotifyChannel(getProcessEnv(false, 'SLACK_URL'))],
      },
      contractsFilter: findERC20Contracts(),
      monitor: mintMonitor('ERC20', '100'),
    },
    'Large-Mint-ERC721': {
      notification: {
        channels: [getSlackNotifyChannel(getProcessEnv(false, 'SLACK_URL'))],
      },
      contractsFilter: findContractsWithInterface(erc721abi),
      monitor: mintMonitor('ERC721', '100'),
    },
    'attack-detector': {
      notification: {
        channels: [getSlackNotifyChannel(getProcessEnv(false, 'SLACK_URL'))],
      },
      monitor: attackDetectorMonitor(),
      contractsFilter: (c) => Promise.resolve(c),
    },
    Proxies: {
      notification: {
        channels: [getSlackNotifyChannel(getProcessEnv(false, 'SLACK_URL'))],
      },
      monitor: upgradesMonitor(),
      contractsFilter: (c) => Promise.resolve(c),
    },
    AccessControl: {
      notification: {
        channels: [getSlackNotifyChannel(getProcessEnv(false, 'SLACK_URL'))],
      },
      monitor: accessMonitor(),
      contractsFilter: findContractsWithInterfaces([
        AccessContolAbi,
        AccessControlDefaultAdminAbi,
      ]),
    },
  },

  outDir: './out',
  accounts: {
    logActions: true,
    lowOnGasThreshold: '1',
  },
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
  ],
  excludeAccounts: ['0x000000000000AAeB6D7670E522A718067333cd4E'],
};
export default config;
module.exports = config;
