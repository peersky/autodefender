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
import {Network} from '@openzeppelin/defender-base-client';
import {sortByNetwork} from '../utils';
import _ from 'lodash';

export const monitorsGenerator = async (
  deploymentRecords: DeploymentRecord[],
  config: DefenderConfigType
) => {
  const monitors: Record<string, YSentinel> = {};
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
        console.log(`Building ${monitorName} monitor...`);
        const template = config.monitors[monitorName];
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
              monitors[`${monitorName}.${networkKey}`] = r.monitor;
              functions = {...functions, ...r.autotasks};
              secrets = {...secrets, ...r.secrets};
              return r;
            });
          });
      }

      await Promise.all(Object.values(_monitorPromises));
      for (const accountMonitorName in config.extractedAccountsMonitoring) {
        console.log(`Building ${accountMonitorName} monitor...`);
        const template = config.extractedAccountsMonitoring[accountMonitorName];
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
              monitors[`${accountMonitorName}.${networkKey}`] = r.monitor;
              functions = {...functions, ...r.autotasks};
              secrets = {...secrets, ...r.secrets};
              return r;
            });
          });
      }
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
    functions[conditionHash] = conditionYAutotask;
    if (actionsParams?.condition?.secrets) {
      console.log(
        'actionsParams?.condition?.secrets...',
        actionsParams?.condition?.secrets
      );
      for (const key in actionsParams.condition.secrets) {
        console.log('secret key:', conditionYAutotask.name + '_' + key);
        secrets[conditionYAutotask.name + '_' + key] =
          actionsParams.condition.secrets[key];
      }
      console.log('secrets:', secrets);
    }
  }
  if (_trigger) {
    const triggerYAutotask = generateFunction(_trigger, actionsParams?.trigger);
    triggerHash = ethers.utils.hashMessage(JSON.stringify(triggerYAutotask));
    functions[triggerHash] = triggerYAutotask;
    if (actionsParams?.trigger?.secrets) {
      for (const key in actionsParams.trigger.secrets) {
        secrets[triggerYAutotask.name + '_' + key] =
          actionsParams.trigger.secrets[key];
      }
    }
  }

  const sentinel: YSentinel = {
    ...(_monitor as YSentinel),
    'notify-config': notifyConfig,
    'autotask-condition': (_condition
      ? '${self:functions.' + conditionHash + '}'
      : undefined) as any as YAutotask,
    'autotask-trigger': (_trigger
      ? '${self:functions}' + conditionHash + '}'
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
    name: _.last(functionPath.split('/').slice(0, -1)) as string,
    path: functionPath,
    trigger: {
      type: 'sentinel',
    },
    relayer: relayName ? (relayResourcePath as any as YRelayer) : undefined,
    paused: false,
  };

  if (props?.relayNetwork) {
    const relativeYrelay =
      '${self:resources.Resources.relayers.' + relayName + '}';

    action.relayer = relativeYrelay as any as YRelayer;
  }
  console.log('action.relayer', action.relayer);

  return action;
};

const extractRelayName = (relativeYPath: string) => {
  console.log(relativeYPath);
  console.log(
    relativeYPath
      .replace('${self:resources.Resources.relayers.', '')
      .slice(0, -1)
  );
  return relativeYPath
    .replace('${self:resources.Resources.relayers.', '')
    .slice(0, -1);
};

const generateRelay = (
  relativeYPath: string,
  networkKey: Network,
  config: DefenderConfigType
) => {
  console.log('generateRelay', relativeYPath, networkKey);
  let _relay = {};
  const relayKey = extractRelayName(relativeYPath);
  console.log('relayKey', relayKey);
  if (relayKey === `DEFAULT_READER_${networkKey}`) {
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
