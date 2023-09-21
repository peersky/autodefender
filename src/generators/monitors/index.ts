import {ethers} from 'ethers';
import {
  DefenderConfigType,
  StandardMonitroingInterfaces,
  DeploymentRecord,
} from '../../types';
import {
  YAutotask,
  YBlockSentinel,
  YFortaSentinel,
  YNotification,
  YSentinel,
} from '@openzeppelin/defender-serverless/lib/types';
import {Network} from '@openzeppelin/defender-base-client';
import {sortByNetwork} from '../../utils';
import {generateOwnableMonitor} from './ownable';
import {generateAccessControlMonitor} from './access';
import {SentinelGenerator} from './baseGenerator';

export const monitorsGenerator = async (
  deploymentRecords: DeploymentRecord[],
  config: DefenderConfigType
) => {
  const priviledgedAccounts = new Set<string>([]);
  const monitors: Record<string, YSentinel> = {};
  let notifications: Record<string, YNotification> = {};
  const functions: YAutotask[] = [];
  console.log(
    'monitorsGenerator... Number of records:',
    deploymentRecords.length
  );
  if (!config.networks) throw new Error('Networks must be set with sentinels');
  const deploymentsByNetwork = sortByNetwork(
    deploymentRecords,
    config.networks
  );
  let networkKey: Network;
  for (networkKey in deploymentsByNetwork) {
    const nDeployments = deploymentsByNetwork[networkKey];
    console.log(
      'For ',
      networkKey,
      'Processing ',
      nDeployments.length,
      ' Contracts'
    );
    const newMonitor = {
      network: networkKey,
      'confirm-level': 1,
    } as YBlockSentinel;
    const provider = new ethers.JsonRpcProvider(
      config.networks[networkKey]?.rpc
    );
    const newFortaMonitor = {network: networkKey} as YFortaSentinel;
    const generator = new SentinelGenerator(config, provider);
    // const ownableAddresses: string[] = [];

    if (config.interfacesToNotify.standard) {
      for (const intefaceNameOrId in config.interfacesToNotify.standard) {
        const _intefaceNameOrId: StandardMonitroingInterfaces =
          intefaceNameOrId as any as StandardMonitroingInterfaces;
        console.log(`Generating ${_intefaceNameOrId} monitor...`);

        switch (_intefaceNameOrId) {
          case 'Ownable': {
            const val = await generateOwnableMonitor(
              newMonitor,
              config,
              nDeployments,
              priviledgedAccounts,
              provider,
              notifications
            );
            monitors[val.resourceName] = val.newMonitor;
            notifications = {...val.notifications};
            break;
          }
          case 'AccessControl': {
            const val = await generateAccessControlMonitor(
              newMonitor,
              config,
              nDeployments,
              priviledgedAccounts,
              provider
            );
            monitors[val.resourceName] = val.newMonitor;
            notifications = {...notifications, ...val.notifications};
            break;
          }
          case 'ERC1155': {
            const val = await generator.standardMonitorGenerator(
              newMonitor,
              nDeployments,
              'ERC1155'
            );
            monitors[val.resourceName] = val.newMonitor;
            notifications = {...notifications, ...val.notifications};
            break;
          }
          case 'ERC20': {
            const val = await generator.standardMonitorGenerator(
              newMonitor,
              nDeployments,
              'ERC20'
            );
            monitors[val.resourceName] = val.newMonitor;
            notifications = {...notifications, ...val.notifications};
            break;
          }
          case 'Proxies': {
            const val = await generator.standardMonitorGenerator(
              newMonitor,
              nDeployments,
              'Proxies'
            );
            monitors[val.resourceName] = val.newMonitor;
            notifications = {...notifications, ...val.notifications};
            break;
          }
          case 'Governor': {
            const val = await generator.standardMonitorGenerator(
              newMonitor,
              nDeployments,
              'Governor'
            );
            monitors[val.resourceName] = val.newMonitor;
            notifications = {...notifications, ...val.notifications};
            break;
          }
          case 'ERC721': {
            const val = await generator.standardMonitorGenerator(
              newMonitor,
              nDeployments,
              'ERC721'
            );
            monitors[val.resourceName] = val.newMonitor;
            notifications = {...notifications, ...val.notifications};
            break;
          }
          case 'attack-detector': {
            const val = await generator.standardMonitorGenerator(
              newFortaMonitor,
              nDeployments,
              'attack-detector'
            );
            monitors[val.resourceName] = val.newMonitor;
            notifications = {...notifications, ...val.notifications};
            break;
          }

          default:
          // If custom interface is being used
        }
      }
    }
  }
  console.log(
    'Generated',
    Object.keys(monitors).length,
    'monitors:',
    Object.values(monitors).map((v) => v.name)
  );
  return {
    monitors,
    functions,
    notifications: notifications,
  };
};
