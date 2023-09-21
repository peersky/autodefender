import {getProcessEnv} from './src/utils';
import {DefenderServerless} from './src/defenderPluginTypes';
import df from './defender.config';

export async function config(print: boolean): Promise<DefenderServerless> {
  if (!df.projectName)
    throw new Error('Project name not set, fix defender.config.ts');
  const contractsF = (
    await import(`${df.outDir}/contracts.json`)
  ).default.reduce(
    (obj: any, item: any) =>
      Object.assign(obj, {
        [item.name]: {
          abi: item.abi,
          address: item.address,
          network: item.network,
          name: item.name,
        },
      }),
    {}
  );
  console.log('Deploying ', Object.keys(contractsF).length, ' Contracts');
  const ret: DefenderServerless = {
    service: 'contracts' + df.projectName,
    configValidationMode: 'error',
    frameworkVersion: '3',
    plugins: ['@openzeppelin/defender-serverless'],
    provider: {
      name: 'defender',
      stage: "${opt:stage, 'dev'}",
      stackName: 'contracts_' + df.projectName,
      ssot: true,
    },
    defender: {
      key: getProcessEnv(print, 'DEFENDER_KEY'),
      secret: getProcessEnv(print, 'DEFENDER_SECRET'),
    },
    resources: {
      Resources: {
        contracts: contractsF,
      },
    },
  };
  // if (print) {
  //   inspect.defaultOptions.depth = null;
  //   console.log(dump(ret));
  // }
  return ret;
}

module.exports = config(require.main === module);
