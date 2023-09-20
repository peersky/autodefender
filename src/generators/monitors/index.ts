import {ZeroAddress, ethers} from 'ethers';
import {
  DefenderConfigType,
  StandardMonitroingInterfaces,
  DeploymentRecord,
} from '../../types';
import OwnableAbi from '../../../abis/Ownable.abi.json';
import {Ownable} from '../../types/typechain/Ownable';
import {
  YAutotask,
  YBlockSentinel,
  YNotification,
  YSentinel,
} from '@openzeppelin/defender-serverless/lib/types';
import {Network} from '@openzeppelin/defender-base-client';
import {eventSlicer} from '../../utils';
import {sortByNetwork} from '../../utils';
import {generateOwnableMonitor} from './ownable';
const contractOwnableBase = new ethers.Contract(
  ZeroAddress,
  OwnableAbi
) as unknown as Ownable;

export const monitorsGenerator = async (
  deploymentRecords: DeploymentRecord[],
  config: DefenderConfigType
) => {
  let priviledgedAccounts = new Set<string>([]);
  let monitors: Record<string, YSentinel> = {};
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
    console.log('networkIndex.network.rpc', config.networks[networkKey]?.rpc);
    const provider = new ethers.JsonRpcProvider(
      config.networks[networkKey]?.rpc
    );
    // const ownableAddresses: string[] = [];

    console.log(
      contractOwnableBase
        .getEvent('OwnershipTransferred')
        .fragment.format('minimal')
        .slice(6)
        .replace(', ', ',')
    );
    // newMonitor.
    newMonitor.conditions = {
      event: [
        {
          signature: eventSlicer<Ownable>(
            contractOwnableBase,
            'OwnershipTransferred'
          ),
        },
      ],
      function: [{signature: ''}],
    };
    if (config.interfacesToNotify.standard) {
      for (const intefaceNameOrId in config.interfacesToNotify.standard) {
        const _intefaceNameOrId: StandardMonitroingInterfaces =
          intefaceNameOrId as any as StandardMonitroingInterfaces;
        switch (_intefaceNameOrId) {
          case 'Ownable': {
            const r = await generateOwnableMonitor(
              newMonitor,
              config,
              nDeployments,
              priviledgedAccounts,
              provider,
              notifications,
              monitors
            );
            notifications = {...r.notifications};
            monitors = {...r.monitors};
            priviledgedAccounts = r.priviledgedAccounts;
            break;
          }
          case 'AccessControl': {
            const r = await generateAccessControlMonitor(
              newMonitor,
              config,
              nDeployments,
              priviledgedAccounts,
              provider,
              notifications,
              monitors
            );
            notifications = {...r.notifications};
            monitors = {...r.monitors};
            priviledgedAccounts = r.priviledgedAccounts;
            break;
          }

          //     // const ownableContractSolidity = readFileSync(
          //     //   '../node_modules/@openzeppelin/contracts/access/Ownable.sol',
          //     //   'utf8'
          //     // );
          //     // const OwnableAbi = solc.compile(
          //     //   JSON.stringify(ownableContractSolidity)
          //     // );
          //     // console.dir(OwnableAbi);
          //     // const interface = new ethers.Interface(OwnableAbi);
          //     break;
          //   }
          //   case 'Governor':
          //     break;
          //   case 'Proxies':
          //     break;
          //   case 'Roles':
          //     break;
          default:
          // If custom interface is being used

          // return 0;
        }
      }
    }
  }
  console.log('Generated', Object.keys(monitors).length, 'monitors');
  return {
    monitors,
    functions,
    notifications: notifications,
  };
};

// exports.monitorsGenerator = monitorsGenerator;
