import {getProcessEnv, getSlackNotifyChannel} from './src/utils';
const polygonRPC = getProcessEnv(false, 'POLYGON_RPC_URL');
const mainnerRPC = getProcessEnv(false, 'MAINNET_RPC_URL');

import {DefenderConfigType} from './src/types/index';
const config: DefenderConfigType = {
  projectName: 'WORKSHOP1',
  path: 'https://api.github.com/repos/thesandboxgame/sandbox-smart-contracts/contents/packages/core/deployments',
  networks: {
    matic: {rpc: polygonRPC, directoryName: 'polygon'},
    mainnet: {rpc: polygonRPC, directoryName: 'mainnet'},
  },
  interfacesToNotify: {
    standard: {
      AccessControl: {
        notifyConfig: {
          channels: [getSlackNotifyChannel(getProcessEnv(false, 'SLACK_URL'))],
        },
      },
      ERC1155: {
        notifyConfig: {
          channels: [getSlackNotifyChannel(getProcessEnv(false, 'SLACK_URL'))],
        },
        config: {
          largeMintValue: '10',
        },
      },
      ERC20: {
        notifyConfig: {
          channels: [getSlackNotifyChannel(getProcessEnv(false, 'SLACK_URL'))],
        },
        config: {
          largeMintValue: '10',
        },
      },
      ERC721: {
        notifyConfig: {
          channels: [getSlackNotifyChannel(getProcessEnv(false, 'SLACK_URL'))],
        },
      },
      Proxies: {
        notifyConfig: {
          channels: [getSlackNotifyChannel(getProcessEnv(false, 'SLACK_URL'))],
        },
      },
      Ownable: {
        notifyConfig: {
          channels: [getSlackNotifyChannel(getProcessEnv(false, 'SLACK_URL'))],
        },
      },
      'attack-detector': {
        notifyConfig: {
          channels: [getSlackNotifyChannel(getProcessEnv(false, 'SLACK_URL'))],
        },
      },
    },
  },
  outDir: './out',
  accounts: {
    logActions: true,
    lowOnGasThreshold: '1',
  },
  fraudMonitoring: ['ERC20'],
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
