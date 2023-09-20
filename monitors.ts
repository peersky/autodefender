import {dump} from 'js-yaml';
import {getProcessEnv} from './src/utils';
import {DefenderServerless} from './src/defenderPluginTypes';
import {inspect} from 'util';
import df from './defender.config';
import MonitoringResources from './out/monitors.json';
import {YSentinel} from '@openzeppelin/defender-serverless/lib/types';
export async function config(print: boolean): Promise<DefenderServerless> {
  if (!df.projectName)
    throw new Error('Project name not set, fix defender.config.ts');

  console.log(
    'Deploying ',
    Object.keys(MonitoringResources.monitors).length,
    ' Contracts'
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
      ssot: false,
    },
    defender: {
      key: getProcessEnv(print, 'DEFENDER_KEY'),
      secret: getProcessEnv(print, 'DEFENDER_SECRET'),
    },
    resources: {
      Resources: {
        notifications: MonitoringResources.notifications as any,
        sentinels: MonitoringResources.monitors as any as Record<
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
