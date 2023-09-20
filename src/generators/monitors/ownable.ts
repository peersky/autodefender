import {JsonRpcProvider, ZeroAddress, ethers, isAddress} from 'ethers';
import {DefenderConfigType, NotifyConfig, DeploymentRecord} from '../../types';
import OwnableAbi from '../../../abis/Ownable.abi.json';
import {Ownable} from '../../types/typechain/Ownable';
import {
  YBlockSentinel,
  YNotification,
  YSentinel,
} from '@openzeppelin/defender-serverless/lib/types';
import {getMessage} from '../../utils';
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

export const generateOwnableMonitor = async (
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
          '}') as unknown as YNotification;
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
