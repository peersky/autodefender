import {BytesLike, Fragment, JsonFragment} from 'ethers';
import {Network} from '@openzeppelin/defender-base-client';
import {
  YCategory,
  YDatadogConfig,
  YDiscordConfig,
  YEmailConfig,
  YNotification,
  YOpsgenieConfig,
  YPagerdutyConfig,
  YSlackConfig,
  YTelegramConfig,
} from '@openzeppelin/defender-serverless/lib/types';
import {NotificationType} from '@openzeppelin/defender-sentinel-client/lib/models/notification';
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
export interface NotifyConfig {
  timeout?: number;
  message?: string;
  'message-subject'?: string;
  // category?: YCategory;
  channels: YNotification[];
}
export interface DefenderConfigType {
  path: string;
  projectName: string;
  networks?: DefenderConfigNetworksType;
  interfacesToNotify: {
    standard?: Partial<
      Record<keyof TemplatedMonitoringInterfaceType, NotifyConfig>
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
  | 'Roles'
  | 'ERC1155'
  | 'ERC721'
  | 'ERC20'
  | 'AccessControl'
  | 'AccessControlDefaultAdminRules';

interface FortaMonitor {
  botIds: string[];
}
export type FortaMonitors =
  | 'attack-detector'
  | 'spam-scam-detector'
  | 'sentiment-analysis'
  | '';
