import {BytesLike, providers} from 'ethers';
import {Network} from '@openzeppelin/defender-base-client';
import {
  DefenderSubscriberRiskCategory,
  YCategory,
  YFortaSentinel,
  YNotification,
  YSentinel,
} from '@openzeppelin/defender-serverless/lib/types';
import {Fragment} from 'ethers/lib/utils';
import {JsonFragment} from '@ethersproject/abi';
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
  category?: YCategory;
  channels: YNotification[];
}
// export interface InterfaceConfig {
//   notifyConfig: NotifyConfig;
//   config?: any;
// }
export interface DefenderConfigType {
  path: string;
  projectName: string;
  networks?: DefenderConfigNetworksType;
  monitors?: {[key: string]: DefenderMonitorTemplate};
  // interfacesToNotify: {
  //   standard?: Partial<
  //     Record<keyof TemplatedMonitoringInterfaceType, InterfaceConfig>
  //   >;
  //   custom?: CustomMonitoringType;
  // };
  outDir: string;
  accounts: DefenderConfigAccountsType;
  excludeDeployments: string[];
  excludeAccounts: string[];
}

export interface CustomMonitoringInterface {
  notification: YNotification;
}
export type AbiItem = ReadonlyArray<Fragment | JsonFragment | string>;
export interface AddressInfoProps {
  address: string;
  abi?: ReadonlyArray<Fragment | JsonFragment | string>;
}

export type TSentinel = Omit<
  YSentinel,
  'notify-config' | 'addresses' | 'autotask-condition' | 'autotask-trigger'
> & {
  'autotask-condition'?: string;
  'autotask-trigger'?: string;
};

export type TFortaSentinel = Omit<
  YFortaSentinel,
  'notify-config' | 'autotask-condition'
> & {
  'autotask-condition'?: string;
  'autotask-trigger'?: string;
};

export interface PriveledgedAccountOutput {
  account: string;
  riskCategory: DefenderSubscriberRiskCategory;
}
interface TSentinelOutput {
  newMonitor: TSentinel;
  defaultMessage: string;
}
export type TSentinelGetter = (
  contractAddresses: AddressInfoProps[],
  provider: providers.JsonRpcProvider
) => Promise<TSentinelOutput>;
export interface DefenderMonitorTemplate {
  notification: NotifyConfig;
  monitor: TSentinelGetter;
  // channels: YNotification[];
  triggerPath?: string;
  contractsFilter: (
    contractInfo: AddressInfoProps[],
    provider: providers.JsonRpcProvider
  ) => Promise<AddressInfoProps[]>;
  priviledgedAccountFilter?: (
    contractInfo: AddressInfoProps[]
  ) => Promise<string[]>;
}
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
// export type StandardMonitroingInterfaces =
//   | 'Ownable'
//   | 'Governor'
//   | 'Proxies'
//   | 'ERC1155'
//   | 'ERC721'
//   | 'ERC20'
//   | 'AccessControl'
//   | 'attack-detector';
