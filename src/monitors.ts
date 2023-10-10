import {getProcessEnv} from './utils';
import {DefenderServerless} from './types/defenderPluginTypes';
import {YSentinel} from '@openzeppelin/defender-serverless/lib/types';
import {DefenderConfigType} from './types';
import path from 'path';
import {renameSync, symlinkSync} from 'fs';
export async function config(print: boolean): Promise<DefenderServerless> {
  const df: DefenderConfigType = await import(
    path.resolve(
      getProcessEnv(print, 'AUTODEFENDER_CLI_CWD'),
      getProcessEnv(print, 'AUTODEFENDER_CONFIG_PATH')
    )
  );
  const MonitoringResources = await import(
    path.resolve(
      getProcessEnv(print, 'AUTODEFENDER_CLI_CWD'),
      df.outDir,
      'monitors.json'
    )
  );

  const _MonitoringResources = MonitoringResources as any;
  const configFilePath = `${path.dirname(
    path.resolve(
      getProcessEnv(print, 'AUTODEFENDER_CLI_CWD'),
      getProcessEnv(print, 'AUTODEFENDER_CONFIG_PATH')
    )
  )}`;
  if (_MonitoringResources.functions && __dirname !== configFilePath) {
    try {
      symlinkSync(path.relative(__dirname, configFilePath), 'cwd');
    } catch (e) {
      renameSync('cwd', 'oldcwd');
      symlinkSync(path.relative(__dirname, configFilePath), 'cwd');
    }
    Object.keys(_MonitoringResources.functions).map((fkey) => {
      _MonitoringResources.functions[fkey] = {
        ..._MonitoringResources.functions[fkey],
        path: path.join('cwd', _MonitoringResources.functions[fkey].path),
      };
    });
  }
  if (!df.projectName)
    throw new Error('Project name not set, fix defender.config.ts');
  console.log(
    'Deploying ',
    Object.keys(_MonitoringResources.monitors).length,
    ' Monitors'
  );

  const ret: DefenderServerless = {
    service: 'monitors' + df.projectName,
    configValidationMode: 'error',
    frameworkVersion: '3',
    plugins: ['@openzeppelin/defender-serverless'],
    provider: {
      name: 'defender',
      stage: "${opt:stage, 'dev'}",
      stackName: 'monitors_' + df.projectName,
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
