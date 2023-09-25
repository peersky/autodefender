import {ethers, providers} from 'ethers';
import {
  DefenderConfigType,
  DeploymentRecord,
  AddressInfoProps,
  NotifyConfig,
  TSentinelGetter,
} from '../types';
import {
  YAutotask,
  YBlockSentinel,
  YFortaSentinel,
  YNotification,
  YSentinel,
} from '@openzeppelin/defender-serverless/lib/types';
import {Network} from '@openzeppelin/defender-base-client';
import {sortByNetwork} from '../utils';

export const monitorsGenerator = async (
  deploymentRecords: DeploymentRecord[],
  config: DefenderConfigType
) => {
  const monitors: Record<string, YSentinel> = {};
  const functions: YAutotask[] = [];

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

    const provider = new ethers.providers.JsonRpcProvider(
      config.networks[networkKey]?.rpc
    );

    if (config.monitors) {
      const _monitorPromises: {[k: string]: Promise<YSentinel>} = {};
      for (const monitorName in config.monitors) {
        console.log(`Building ${monitorName} monitor...`);
        const template = config.monitors[monitorName];
        _monitorPromises[`${monitorName}.${networkKey}`] = monitorBuilder(
          template.monitor,
          template.contractsFilter(nDeployments, provider),
          template.notification,
          provider,
          networkKey
        ).then((r) => (monitors[`${monitorName}.${networkKey}`] = r));
      }

      await Promise.all(Object.values(_monitorPromises));
    }
  }
  const notifications: {[key: string]: YNotification} = {};
  for (const k in monitors) {
    for (const ch of monitors[k]['notify-config'].channels) {
      const hash = ethers.utils.hashMessage(JSON.stringify(ch));
      if (!notifications[hash]) notifications[hash] = ch;
    }
  }
  console.log(
    'Generated',
    Object.keys(monitors).length,
    'monitors:',
    Object.values(monitors).map((v) => v.name),
    'and ',
    Object.keys(notifications).length,
    ' notification channels'
  );
  return {
    monitors,
    functions,
    notifications: notifications,
  };
};

const monitorBuilder = async (
  template: TSentinelGetter,
  addresses: Promise<AddressInfoProps[]>,
  notifyConfig: NotifyConfig,
  provider: providers.JsonRpcProvider,
  networkKey: Network
): Promise<YSentinel> => {
  const _addresses = await addresses;
  const {newMonitor, defaultMessage} = await template(_addresses, provider);
  const _monitor = {
    ...newMonitor,
    'notify-config': {...notifyConfig},
    network: networkKey,
    'confirm-level': 1,
    addresses: _addresses.map((_a) => _a.address),
  };
  if (_monitor['notify-config'].message)
    _monitor['notify-config'].message = defaultMessage;
  const monitor: YSentinel =
    _monitor.type === 'FORTA'
      ? (_monitor as YFortaSentinel)
      : (_monitor as YBlockSentinel);
  return monitor;
};
