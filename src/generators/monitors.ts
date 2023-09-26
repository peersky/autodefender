import {ethers, providers} from 'ethers';
import {
  DefenderConfigType,
  DeploymentRecord,
  NotifyConfig,
  TSentinelGetter,
  MatcherFindings,
  RelatedAccount,
  TSentinel,
  TFortaSentinel,
  ActionParam,
  ActionsParams,
  TSentinelOutput,
} from '../types';
import {
  YAutotask,
  YBlockSentinel,
  YFortaSentinel,
  YNotification,
  YRelayer,
  YSecret,
  YSentinel,
} from '@openzeppelin/defender-serverless/lib/types';
import {Network, Networks} from '@openzeppelin/defender-base-client';
import {sortByNetwork} from '../utils';
import _ from 'lodash';

export const monitorsGenerator = async (
  deploymentRecords: DeploymentRecord[],
  config: DefenderConfigType
) => {
  let monitors: Record<string, YSentinel> = {};
  let functions: Record<string, YAutotask> = {};
  let secrets: Record<string, YSecret> = {};
  const relayers: Record<string, YRelayer> = {};

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

    const reledAccounts: RelatedAccount[] = [];
    if (config.monitors) {
      const _monitorPromises: {
        [k: string]: Promise<{
          monitor: YSentinel;
          autotasks: {[key: string]: YAutotask};
          secrets: {[key: string]: YSecret};
        }>;
      } = {};
      for (const monitorName in config.monitors) {
        console.log(`Building ${monitorName} monitor for ${networkKey}...`);
        const template = config.monitors[monitorName];
        if (monitors[`${monitorName}.${networkKey}`])
          throw new Error(
            'Monitor' + `${monitorName}.${networkKey}` + ' Already defined'
          );
        _monitorPromises[`${monitorName}.${networkKey}`] = template
          .filter(nDeployments, provider)
          .then(async (findings) => {
            findings.forEach((finding) => {
              if (finding.related && finding.related.length > 0)
                reledAccounts.push(...finding.related);
            });
            return monitorBuilder(
              template.monitor,
              findings,
              template.notification,
              provider,
              networkKey
            ).then((r) => {
              monitors[`${monitorName}.${networkKey}`] = _.cloneDeep(r.monitor);
              functions = {...functions, ...r.autotasks};
              secrets = {...secrets, ...r.secrets};
              return r;
            });
          });
      }

      // await Promise.all(Object.values(_monitorPromises));
      for (const accountMonitorName in config.extractedAccountsMonitoring) {
        console.log(
          `Building ${accountMonitorName} monitor for ${networkKey}...`
        );
        const template = config.extractedAccountsMonitoring[accountMonitorName];

        if (monitors[`${accountMonitorName}.${networkKey}`])
          throw new Error(
            'Monitor' +
              `${accountMonitorName}.${networkKey}` +
              ' Already defined'
          );
        _monitorPromises[`${accountMonitorName}.${networkKey}`] = template
          .filter(reledAccounts, provider)
          .then(async (findings) => {
            findings.forEach((finding) => {
              if (finding.related && finding.related.length > 0)
                reledAccounts.push(...finding.related);
            });
            return monitorBuilder(
              template.monitor,
              findings,
              template.notification,
              provider,
              networkKey
            ).then((r) => {
              monitors[`${accountMonitorName}.${networkKey}`] = _.cloneDeep(
                r.monitor
              );
              functions = {...functions, ...r.autotasks};
              secrets = {...secrets, ...r.secrets};
              return r;
            });
          });
      }
      await Promise.all(Object.values(_monitorPromises));
    }
    for (const fn in functions) {
      if (functions[fn].relayer) {
        const {relay, relayKey} = generateRelay(
          functions[fn].relayer as any as string,
          networkKey,
          config
        );
        relayers[relayKey] = relay;
      }
    }
  }

  const notifications: {[key: string]: YNotification} = {};
  const nm = _.cloneDeep(monitors);
  Object.keys(monitors).forEach((k) => {
    let ovr: string[] = [];
    for (const ch of monitors[k]['notify-config'].channels) {
      const hash = ethers.utils.hashMessage(JSON.stringify(ch));
      notifications['_' + hash] = ch;
      ovr.push(getYmlRelativePath('notifications', '_' + hash));
    }
    nm[k]['notify-config'].channels = [...ovr] as any as YNotification[];
    ovr = [];
  });
  monitors = nm;
  console.log(
    'Generated',
    Object.keys(monitors).length,
    'monitors:',
    Object.values(monitors).map((v) => v.name),
    ', ',
    Object.keys(notifications).length,
    ' notification channels, ',
    Object.keys(secrets).length,
    'secrets,',
    Object.keys(functions).length,
    'functions and, ',
    Object.keys(relayers).length,
    'relayers'
  );
  return {
    monitors,
    functions,
    notifications: notifications,
    secrets,
    relayers,
  };
};

const monitorBuilder = async (
  template: TSentinelGetter<any, any>,
  findings: MatcherFindings[],
  notifyConfig: NotifyConfig,
  provider: providers.JsonRpcProvider,
  networkKey: Network
): Promise<{
  monitor: YSentinel;
  autotasks: {[key: string]: YAutotask};
  secrets: {[key: string]: YSecret};
}> => {
  const {newMonitor, defaultMessage, actionsParams} = await template(
    findings.map((f) => f.account),
    provider,
    networkKey
  );
  const _monitor = {
    ...newMonitor,
    'notify-config': {...notifyConfig},
    network: networkKey,
    'confirm-level': 1,
    addresses: findings.map((f) => f.account.address),
  };
  if (_monitor['notify-config'].message)
    _monitor['notify-config'].message = defaultMessage;

  const functions: Record<string, YAutotask> = {};
  const secrets: {[key: string]: YSecret} = {};
  let conditionHash;
  let triggerHash;
  const _condition = _monitor['autotask-condition'];
  const _trigger = _monitor['autotask-trigger'];

  if (_condition) {
    const conditionYAutotask = generateFunction(
      _condition,
      actionsParams?.condition
    );
    conditionHash = ethers.utils.hashMessage(
      JSON.stringify(conditionYAutotask)
    );
    functions[`_${conditionHash}`] = conditionYAutotask;
    if (actionsParams?.condition?.secrets) {
      for (const key in actionsParams.condition.secrets) {
        secrets[conditionYAutotask.name + '_' + networkKey + key] =
          actionsParams.condition.secrets[key];
      }
    }
  }
  if (_trigger) {
    const triggerYAutotask = generateFunction(_trigger, actionsParams?.trigger);
    triggerHash = ethers.utils.hashMessage(JSON.stringify(triggerYAutotask));
    functions[`_${triggerHash}`] = triggerYAutotask;
    if (actionsParams?.trigger?.secrets) {
      for (const key in actionsParams.trigger.secrets) {
        secrets[triggerYAutotask.name + '_' + networkKey + key] =
          actionsParams.trigger.secrets[key];
      }
    }
  }

  const sentinel: YSentinel = {
    ...(_monitor as YSentinel),
    'notify-config': notifyConfig,
    'autotask-condition': (_condition
      ? '${self:functions.' + '_' + conditionHash + '}'
      : undefined) as any as YAutotask,
    'autotask-trigger': (_trigger
      ? '${self:functions}' + '_' + conditionHash + '}'
      : undefined) as any as YAutotask,
  };

  return {monitor: sentinel, autotasks: functions, secrets};
};

const generateFunction = (
  functionPath: string,
  props?: ActionParam<any>
): YAutotask => {
  const relayName = props?.relayNetwork
    ? props?.customRelay ?? 'DEFAULT_READER' + '_' + props?.relayNetwork
    : undefined;
  const relayResourcePath =
    '${self:resources.Resources.relayers.' + relayName + '}';
  const action: YAutotask = {
    name: _.last(functionPath.split('/')) as string,
    path: functionPath,
    trigger: {
      type: 'sentinel',
    },
    relayer: relayName ? (relayResourcePath as any as YRelayer) : undefined,
    paused: false,
  };

  if (props?.relayNetwork) {
    action.name += '_' + props.relayNetwork;
    const relativeYrelay =
      '${self:resources.Resources.relayers.' + relayName + '}';

    action.relayer = relativeYrelay as any as YRelayer;
  }

  return action;
};

const extractRelayName = (relativeYPath: string) => {
  return relativeYPath
    .replace('${self:resources.Resources.relayers.', '')
    .slice(0, -1);
};

const getYmlRelativePath = (
  resourceType: 'Sentinels' | 'Relayers' | 'functions' | 'notifications',
  name: string
) => {
  const prefix =
    '${self:' +
    (resourceType === 'functions'
      ? resourceType
      : 'resources.Resources.' + resourceType);
  return prefix + '.' + name + '}';
};

const generateRelay = (
  relativeYPath: string,
  networkKey: Network,
  config: DefenderConfigType
) => {
  let _relay = {};
  const relayKey = extractRelayName(relativeYPath);

  if (
    relayKey.startsWith(`DEFAULT_READER_`) &&
    Networks.includes(relayKey.replace('DEFAULT_READER_', '') as any)
  ) {
    _relay = {
      name: 'Default relay',
      network: networkKey,
      'min-balance': 0,
      'api-keys': [],
    };
  } else {
    if (!config?.relayers?.[relayKey])
      throw new Error(
        'Relay Key:' + relayKey + ' was not found in config.relayers'
      );
    {
      _relay = config.relayers[relayKey];
    }
  }
  const relay: YRelayer = _relay as YRelayer;
  return {relay, relayKey};
};
