import {getProcessEnv} from './src/utils';
import {DefenderServerless} from './src/defenderPluginTypes';
import df from './defender.config';
import MonitoringResources from './out/monitors.json';
import {YSentinel} from '@openzeppelin/defender-serverless/lib/types';
export async function config(print: boolean): Promise<DefenderServerless> {
  const _MonitoringResources = MonitoringResources as any;
  if (!df.projectName)
    throw new Error('Project name not set, fix defender.config.ts');

  console.log(
    'Deploying ',
    Object.keys(_MonitoringResources.monitors).length,
    ' Monitors',
    _MonitoringResources.functions && (_MonitoringResources.functions as any)
  );
  const ret: DefenderServerless = {
    service: 'contracts' + df.projectName,
    configValidationMode: 'error',
    frameworkVersion: '3',
    plugins: ['@openzeppelin/defender-serverless'],
    provider: {
      name: 'defender',
      stage: "${opt:stage, 'dev'}",
      stackName: 'contracts_' + df.projectName,
      ssot: df.ssot,
    },
    defender: {
      key: getProcessEnv(print, 'DEFENDER_KEY'),
      secret: getProcessEnv(print, 'DEFENDER_SECRET'),
    },
    functions:
      _MonitoringResources.functions && (_MonitoringResources.functions as any),
    resources: {
      Resources: {
        secrets: {stack: _MonitoringResources?.secrets},
        relayers: _MonitoringResources?.relayers,
        notifications: _MonitoringResources.notifications,
        sentinels: _MonitoringResources.monitors as any as Record<
          string,
          YSentinel
        >,
      },
    },
  };
  // if (print) {
  //   inspect.defaultOptions.depth = null;
  //   console.log(dump(ret));
  // }
  return ret;
}

module.exports = config(false);
