import {getProcessEnv, getSlackNotifyChannel} from './src/utils';
const polygonRPC = getProcessEnv(false, 'POLYGON_RPC_URL');

import {DefenderConfigType} from './src/types/index';
const config: DefenderConfigType = {
  path: 'https://api.github.com/repos/thesandboxgame/sandbox-smart-contracts/contents/packages/core/deployments',
  projectName: 'WORKSHOP1',
  networks: {matic: {rpc: polygonRPC, directoryName: 'polygon'}},
  interfacesToNotify: {
    standard: {
      Ownable: {
        channels: [getSlackNotifyChannel(getProcessEnv(false, 'SLACK_URL'))],
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
  ],
  excludeAccounts: [],
};
export default config;
module.exports = config;
