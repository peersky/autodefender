import {BytesLike, providers} from 'ethers';
import {Network} from '@openzeppelin/defender-base-client';
import {
  DefenderSubscriberRiskCategory,
  YCategory,
  YFortaSentinel,
  YNotification,
  YRelayer,
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
  getter?: (config: DefenderConfigType) => Promise<DeploymentRecord[]>;
  ssot: boolean;
  projectName: string;
  networks?: DefenderConfigNetworksType;
  monitors?: {[key: string]: DefenderMonitorTemplate};
  extractedAccountsMonitoring?: {
    [key: string]: Omit<DefenderMonitorTemplate, 'priviledgedAccountFilter'>;
  };
  relayers?: {[key: string]: YRelayer};
  // interfacesToNotify: {
  //   standard?: Partial<
  //     Record<keyof TemplatedMonitoringInterfaceType, InterfaceConfig>
  //   >;
  //   custom?: CustomMonitoringType;
  // };
  outDir: string;
  excludeDeployments: string[];
  excludeAccounts: string[];
}

export interface CustomMonitoringInterface {
  notification: YNotification;
}
export type AbiItem = ReadonlyArray<Fragment | JsonFragment | string>;
export interface AddressInfo {
  address: string;
  abi?: ReadonlyArray<Fragment | JsonFragment | string>;
  name?: string;
  network?: string;
  aux?: any;
}
export type RelationshipType =
  | 'Priveledged'
  | 'Benenificiary'
  | 'Payee'
  | 'Oracle';
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
export interface CustomRelay {
  key: string;
}

export type ActionParam<T> = {
  relayNetwork?: Network;
  secrets?: T;
  customRelay?: string;
};
export interface ActionsParams<T, K> {
  condition?: ActionParam<T>;
  trigger?: ActionParam<K>;
}
export interface TSentinelOutput<T, K> {
  newMonitor: TSentinel;
  defaultMessage: string;
  actionsParams?: ActionsParams<T, K>;
}
export type TSentinelGetter<T, K> = (
  contractAddresses: AddressInfo[],
  provider: providers.JsonRpcProvider,
  networkName: Network
) => Promise<TSentinelOutput<T, K>>;

export interface ActionSpec {
  path: string;
  params: ActionParam<any>;
}
export interface RelatedAccount extends AddressInfo {
  relationship: RelationshipType;
  to: string;
}
export interface MatcherFindings {
  account: AddressInfo;
  related?: RelatedAccount[];
}
export interface DefenderMonitorTemplate {
  notification: NotifyConfig;
  monitor: TSentinelGetter<
    Record<string, string | never>,
    Record<string, string | never>
  >;
  // channels: YNotification[];
  triggerPath?: string;
  filter: (
    contractInfo: AddressInfo[],
    provider: providers.JsonRpcProvider
  ) => Promise<MatcherFindings[]>;
  priviledgedAccountFilter?: (contractInfo: AddressInfo[]) => Promise<string[]>;
}
export interface CustomMonitor {
  abi: ReadonlyArray<Fragment | JsonFragment | string>;
  notification: YNotification;
}
export type CustomMonitoringType = Record<string, CustomMonitor>;
export interface DeploymentRecord {
  network: Network;
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
