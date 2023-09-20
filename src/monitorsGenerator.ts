import {
  BaseContract,
  Contract,
  JsonRpcProvider,
  ZeroAddress,
  ethers,
  isAddress,
} from 'ethers';
import {
  DefenderConfigNetworkType,
  DefenderConfigType,
  DefenderConfigNetworksType,
  TemplatedMonitoringInterfaceType,
  CustomMonitor,
  NotifyConfig,
  StandardMonitroingInterfaces,
} from '../src/types';
import OwnableAbi from '../abis/Ownable.abi.json';
import AccessControlAbi from "../abis/"
import solc from 'solc';
import {CompileFailedError, CompileResult, compileSol} from 'solc-typed-ast';
import {readFileSync} from 'fs';
import {Ownable, OwnableInterface} from './types/typechain/Ownable';
import {
  YAutotask,
  YBlockSentinel,
  YNotification,
  YSentinel,
} from '@openzeppelin/defender-serverless/lib/types';
import {Network} from '@openzeppelin/defender-base-client';
import {getMessage} from './utils';
import {AccessControl} from './types/typechain';
const contractOwnableBase = new ethers.Contract(
  ZeroAddress,
  OwnableAbi
) as unknown as Ownable;
const ontractACBase = new ethers.Contract(
  ZeroAddress,
  OwnableAbi
) as unknown as AccessControl;
interface DeploymentRecord {
  network: string;
  name: string;
  address: string;
  abi: any[];
}
type DeploymentsPerNetwork = {[k in Network]: DeploymentRecord[]};

const sortByNetwork = (
  deploymentRecords: DeploymentRecord[],
  networks: DefenderConfigNetworksType
) => {
  //eslint-disable-next-line
  let sortedByNetwork = {} as DeploymentsPerNetwork;
  Object.keys(networks).forEach((key) => {
    console.log(deploymentRecords[0].network);
    sortedByNetwork[key as Network] = deploymentRecords.filter(
      (_record) => _record.network === key
    );
    //eslint-disable-next-line
  });
  return sortedByNetwork;
};

type Unpacked<T> = T extends (infer U)[] ? U : T;
const eventSlicer = <T extends BaseContract>(
  contract: T,
  event: Unpacked<Parameters<T['getEvent']>>
): string => {
  return contract
    .getEvent(event as string)
    .fragment.format('minimal')
    .slice(6)
    .replace(new RegExp(', ', 'g'), ',')
    .replace(new RegExp(' indexed', 'g'), '');
};
const findAllOwnable = async (
  records: DeploymentRecord[],
  config: DefenderConfigType,
  provider: JsonRpcProvider
) => {
  const owners: string[] = [];
  const contracts: string[] = [];
  const contractOwnableConnected = contractOwnableBase.connect(provider);
  for (const record of records) {
    console.log('Checking if contract is Ownable..', record.address);
    const contractOwnable = contractOwnableConnected.attach(
      record.address
    ) as Ownable;

    const owner = await contractOwnable.owner();
    const ownerMethodLegit = isAddress(owner);

    if (ownerMethodLegit) {
      if (!owners.includes(owner) && !config.excludeAccounts.includes(owner))
        owners.push(owner);

      if (
        !contracts.includes(record.address) &&
        !config.excludeAccounts.includes(record.address)
      )
        contracts.push(record.address);
    }
  }
  return {contracts: contracts, owners: owners};
};
const findAllAccessControl = async (
  records: DeploymentRecord[],
  config: DefenderConfigType,
  provider: JsonRpcProvider
) => {
  const owners: string[] = [];
  const contracts: string[] = [];
  const contractACConnected = contractACBase.connect(provider);
  for (const record of records) {
    console.log('Checking if contract is AccessControl..', record.address);
    const contractOwnable = contractOwnableConnected.attach(
      record.address
    ) as AccessControl;

    const owner = await contractOwnable.owner();
    const ownerMethodLegit = isAddress(owner);

    if (ownerMethodLegit) {
      if (!owners.includes(owner) && !config.excludeAccounts.includes(owner))
        owners.push(owner);

      if (
        !contracts.includes(record.address) &&
        !config.excludeAccounts.includes(record.address)
      )
        contracts.push(record.address);
    }
  }
  return {contracts: contracts, owners: owners};
};
const generateOwnableMonitor = async (
  newMonitor: YBlockSentinel,
  config: DefenderConfigType,
  nDeployments: DeploymentRecord[],
  priviledgedAccounts: Set<string>,
  provider: JsonRpcProvider,
  notifications: Record<string, YNotification>,
  monitors: Record<string, YSentinel> = {}
): Promise<{
  priviledgedAccounts: Set<string>;
  notifications: Record<string, YNotification>;
  monitors: Record<string, YSentinel>;
}> => {
  newMonitor['risk-category'] = 'ACCESS-CONTROL';
  newMonitor.abi = OwnableAbi;
  newMonitor.name = `${config.projectName} Ownable`;
  newMonitor.paused = false;
  newMonitor.type = 'BLOCK';
  const {owners, contracts} = await findAllOwnable(
    nDeployments,
    config,
    provider
  );
  if (contracts.length > 0) {
    priviledgedAccounts = new Set([...priviledgedAccounts, ...owners]);
    if (config.interfacesToNotify.standard?.['Ownable']) {
      newMonitor.addresses = contracts;
      const message =
        config.interfacesToNotify.standard?.['Ownable']?.message ??
        getMessage('info-message');
      const notifyConfig: NotifyConfig = {
        ...config.interfacesToNotify.standard?.['Ownable'],
        message: message,
      };
      const hashes = notifyConfig.channels.map((ch) => {
        if (!ch.name) ch.name = 'Ownership notifications';
        return ethers.hashMessage(JSON.stringify(ch));
      });
      const _nc = {...notifyConfig};
      _nc.channels = _nc.channels.map((ch, idx) => {
        return ('${self:resources.Resources.notifications.' +
          hashes[idx] +
          '}') as any;
      });

      hashes.forEach((hash, idx) => {
        if (!notifications[hash])
          notifications[hash] = notifyConfig.channels[idx];
      });
      newMonitor['notify-config'] = _nc;
      monitors['ownable-monitor'] = newMonitor;
    }
  }
  return {monitors, notifications, priviledgedAccounts};
};
const generateAccessControlMonitor = async (
  newMonitor: YBlockSentinel,
  config: DefenderConfigType,
  nDeployments: DeploymentRecord[],
  priviledgedAccounts: Set<string>,
  provider: JsonRpcProvider,
  notifications: Record<string, YNotification>,
  monitors: Record<string, YSentinel> = {}
): Promise<{
  priviledgedAccounts: Set<string>;
  notifications: Record<string, YNotification>;
  monitors: Record<string, YSentinel>;
}> => {
  newMonitor['risk-category'] = 'ACCESS-CONTROL';
  newMonitor.abi = OwnableAbi;
  newMonitor.name = `${config.projectName} Access Control`;
  newMonitor.paused = false;
  newMonitor.type = 'BLOCK';
  const {owners, contracts} = await findAllAccessControl(
    nDeployments,
    config,
    provider
  );
  if (contracts.length > 0) {
    priviledgedAccounts = new Set([...priviledgedAccounts, ...owners]);
    if (config.interfacesToNotify.standard?.['Ownable']) {
      newMonitor.addresses = contracts;
      const message =
        config.interfacesToNotify.standard?.['Ownable']?.message ??
        getMessage('info-message');
      const notifyConfig: NotifyConfig = {
        ...config.interfacesToNotify.standard?.['Ownable'],
        message: message,
      };
      const hashes = notifyConfig.channels.map((ch) => {
        if (!ch.name) ch.name = 'Ownership notifications';
        return ethers.hashMessage(JSON.stringify(ch));
      });
      const _nc = {...notifyConfig};
      _nc.channels = _nc.channels.map((ch, idx) => {
        return ('${self:resources.Resources.notifications.' +
          hashes[idx] +
          '}') as any;
      });

      hashes.forEach((hash, idx) => {
        if (!notifications[hash])
          notifications[hash] = notifyConfig.channels[idx];
      });
      newMonitor['notify-config'] = _nc;
      monitors['ownable-monitor'] = newMonitor;
    }
  }
  return {monitors, notifications, priviledgedAccounts};
};

export const monitorsGenerator = async (
  deploymentRecords: DeploymentRecord[],
  config: DefenderConfigType
) => {
  let priviledgedAccounts = new Set<string>([]);
  let monitors: Record<string, YSentinel> = {};
  let notifications: Record<string, YNotification> = {};
  let functions: YAutotask[] = [];
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
