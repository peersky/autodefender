import {JsonRpcProvider, ZeroAddress, ethers, isAddress} from 'ethers';
import {DefenderConfigType, NotifyConfig, DeploymentRecord} from '../../types';
import OwnableAbi from '../../../abis/Ownable.json';
import {Ownable} from '../../types/typechain/Ownable';
import {
  YBlockSentinel,
  YNotification,
} from '@openzeppelin/defender-serverless/lib/types';
import {eventSlicer, getMessage} from '../../utils';
const contractOwnableBase = new ethers.Contract(
  ZeroAddress,
  OwnableAbi
) as unknown as Ownable;

export const findAllOwnable = async (
  records: DeploymentRecord[],
  config: DefenderConfigType,
  provider: JsonRpcProvider
) => {
  const owners: string[] = [];
  const contracts: string[] = [];
  const contractOwnableConnected = contractOwnableBase.connect(provider);
  for (const record of records) {
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(`Checking... ${record.address}`);
    const contractOwnable = contractOwnableConnected.attach(
      record.address
    ) as Ownable;
    let isOwnable = false;
    try {
      const owner = await contractOwnable.owner();
      isOwnable = isAddress(owner);

      if (isOwnable) {
        if (!owners.includes(owner) && !config.excludeAccounts.includes(owner))
          owners.push(owner);

        if (
          !contracts.includes(record.address) &&
          !config.excludeAccounts.includes(record.address)
        )
          contracts.push(record.address);
      }
    } catch (e) {
      //
    }
  }
  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
  console.log('Found ', contracts.length, 'Ownable contracts');
  return {contracts: contracts, owners: owners};
};

export const generateOwnableMonitor = async (
  newMonitor: YBlockSentinel,
  config: DefenderConfigType,
  nDeployments: DeploymentRecord[],
  priviledgedAccounts: Set<string>,
  provider: JsonRpcProvider,
  notifications: Record<string, YNotification>
) => {
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
        config.interfacesToNotify.standard?.['Ownable']?.notifyConfig.message ??
        getMessage('info-message');
      const notifyConfig: NotifyConfig = {
        ...config.interfacesToNotify.standard?.['Ownable'].notifyConfig,
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
          '}') as unknown as YNotification;
      });

      hashes.forEach((hash, idx) => {
        if (!notifications[hash])
          notifications[hash] = notifyConfig.channels[idx];
      });
      newMonitor['notify-config'] = _nc;
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
    }
  }
  return {
    newMonitor,
    notifications,
    priviledgedAccounts,
    resourceName: 'ownable-monitor',
  };
};
