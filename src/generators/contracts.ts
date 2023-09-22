import {DeploymentRecord} from '../types';

export const contractsFormatter = (deploymentRecords: DeploymentRecord[]) => {
  return JSON.stringify(
    deploymentRecords.map((deployment) => {
      return {
        address: deployment.address,
        abi: deployment.abi,
        name: deployment.name,
        network: deployment.network,
      };
    }),
    null,
    4
  );
};
