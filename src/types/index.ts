import {BytesLike, Fragment, JsonFragment} from 'ethers';
import {Network} from '@openzeppelin/defender-base-client';
import {YNotification} from '@openzeppelin/defender-serverless/lib/types';
export type DefenderConfigNetworkType = {
  rpc?: string;
  directoryName: string;
};
export type DefenderConfigNetworksType = Partial<
  Record<Network, DefenderConfigNetworkType>
>;
export type DefenderConfigAccountsType = {
  logActions: boolean;
  lowOnGasThreshold: BytesLike;
};

export type Unpacked<T> = T extends (infer U)[] ? U : T;
export interface NotifyConfig {
  timeout?: number;
  message?: string;
  'message-subject'?: string;
  // category?: YCategory;
  channels: YNotification[];
}
export interface InterfaceConfig {
  notifyConfig: NotifyConfig;
  config?: any;
}
export interface DefenderConfigType {
  path: string;
  projectName: string;
  networks?: DefenderConfigNetworksType;
  interfacesToNotify: {
    standard?: Partial<
      Record<keyof TemplatedMonitoringInterfaceType, InterfaceConfig>
    >;
    custom?: CustomMonitoringType;
  };
  fraudMonitoring: StandardMonitroingInterfaces[];
  outDir: string;
  accounts: DefenderConfigAccountsType;
  excludeDeployments: string[];
  excludeAccounts: string[];
}

export interface CustomMonitoringInterface {
  notification: YNotification;
}
export type TemplatedMonitoringInterfaceType = Record<
  StandardMonitroingInterfaces,
  YNotification
>;
export interface CustomMonitor {
  abi: ReadonlyArray<Fragment | JsonFragment | string>;
  notification: YNotification;
}
export type CustomMonitoringType = Record<string, CustomMonitor>;
export interface DeploymentRecord {
  network: string;
  name: string;
  address: string;
  abi: any[];
}
export type StandardMonitroingInterfaces =
  | 'Ownable'
  | 'Governor'
  | 'Proxies'
  | 'ERC1155'
  | 'ERC721'
  | 'ERC20'
  | 'AccessControl'
  | 'attack-detector';
