import {
  BaseContract,
  Contract,
  JsonRpcProvider,
  ZeroAddress,
  ethers,
} from 'ethers';
import {
  DefenderConfigType,
  NotifyConfig,
  DeploymentRecord,
  StandardMonitroingInterfaces,
  InterfaceConfig,
} from '../../types';
import erc165abi from '../../../abis/IERC165.json';
import erc1155abi from '../../../abis/IERC1155.json';
import erc721abi from '../../../abis/IERC721.json';
import erc20abi from '../../../abis/IERC20Metadata.json';
import governorAbi from '../../../abis/IGovernor.json';
import AccessControlAbi from '../../../abis/IAccessControlDefaultAdminRules.json';
import proxyAbi from '../../../abis/Proxies.json';
import ownableAbi from '../../../abis/Ownable.json';
import {
  YBlockSentinel,
  YFortaSentinel,
  YNotification,
} from '@openzeppelin/defender-serverless/lib/types';
import {eventSlicer, getInterfaceID, getMessage} from '../../utils';

import {IERC165} from '../../types/typechain/IERC165';
import {IERC721} from '../../types/typechain/IERC721';
import {IAccessControl} from '../../types/typechain/IAccessControl';
import {IERC1155} from '../../types/typechain/IERC1155';
import {IERC20Metadata} from '../../types/typechain/IERC20Metadata';
import {IGovernor} from '../../types/typechain/IGovernor';
import {Proxies} from '../../types/typechain/Proxies';
import {AccessControlDefaultAdminRules} from '../../types/typechain/AccessControlDefaultAdminRules';

const contract165Base = new ethers.Contract(
  ZeroAddress,
  erc165abi
) as unknown as IERC165;

export class SentinelGenerator {
  private provider: JsonRpcProvider;
  private config: DefenderConfigType;
  private erc1155contract = new Contract(
    ZeroAddress,
    erc1155abi
  ) as unknown as IERC1155;
  private erc721contract = new Contract(
    ZeroAddress,
    erc721abi
  ) as unknown as IERC721;
  private erc20contract = new Contract(
    ZeroAddress,
    erc20abi
  ) as unknown as IERC20Metadata;
  private governorContract = new Contract(
    ZeroAddress,
    governorAbi
  ) as unknown as IGovernor;
  private proxyContract = new Contract(
    ZeroAddress,
    proxyAbi
  ) as unknown as Proxies;
  private accessContract = new Contract(
    ZeroAddress,
    AccessControlAbi
  ) as unknown as AccessControlDefaultAdminRules;
  private templatesMap: Record<StandardMonitroingInterfaces, any>;
  constructor(config: DefenderConfigType, provider: JsonRpcProvider) {
    this.config = config;
    this.provider = provider;
    this.templatesMap = {
      'attack-detector': {
        conditions: {
          severity: 1,
          'min-scanner-count': 2,
          'alert-ids': [
            'ATTACK-DETECTOR-1',
            'ATTACK-DETECTOR-2',
            'ATTACK-DETECTOR-3',
            'ATTACK-DETECTOR-4',
            'ATTACK-DETECTOR-5',
          ],
          'agent-ids': [
            '0x80ed808b586aeebe9cdd4088ea4dea0a8e322909c0e4493c993e060e89c09ed1',
          ],
        },
      },
      Ownable: {
        resourceName: 'ownable-monitor',
        abi: ownableAbi,
      },
      ERC20: {
        resourceName: 'erc20-monitor',
        abi: erc20abi,
        conditions: {
          event: [
            {
              signature: eventSlicer<IERC20Metadata>(
                this.erc20contract,
                this.erc20contract.getEvent('Transfer').fragment.format('full')
              ),
              expression: `from==${ZeroAddress} AND value > ${this.config.interfacesToNotify.standard?.['ERC20']?.config['largeMintValue']}`,
            },
          ],
          function: [{signature: ''}],
        },
      },
      ERC1155: {
        resourceName: 'erc1155-monitor',
        abi: erc1155abi,
        conditions: {
          event: [
            {
              signature: eventSlicer<IERC1155>(
                this.erc1155contract,
                this.erc1155contract
                  .getEvent('TransferSingle')
                  .fragment.format('full')
              ),
              expression: `from==${ZeroAddress} AND value > ${this.config.interfacesToNotify.standard?.['ERC1155']?.config['largeMintValue']}`,
            },
          ],
          function: [{signature: ''}],
        },
      },
      ERC721: {
        resourceName: 'erc721-monitor',
        abi: erc721abi,
        conditions: {
          event: [
            {
              signature: eventSlicer<IERC721>(
                this.erc721contract,
                this.erc721contract.getEvent('Transfer').fragment.format('full')
              ),
              expression: `from==${ZeroAddress}`,
            },
          ],
          function: [{signature: ''}],
        },
      },
      AccessControl: {
        resourceName: 'access-monitor',
        abi: AccessControlAbi,
        conditions: {
          event: [
            {
              signature: eventSlicer<AccessControlDefaultAdminRules>(
                this.accessContract,
                this.accessContract
                  .getEvent('RoleAdminChanged')
                  .fragment.format('full')
              ),
            },
            {
              signature: eventSlicer<IAccessControl>(
                this.accessContract,
                this.accessContract
                  .getEvent('RoleGranted')
                  .fragment.format('full')
              ),
            },
            {
              signature: eventSlicer<IAccessControl>(
                this.accessContract,
                this.accessContract
                  .getEvent('RoleAdminChanged')
                  .fragment.format('full')
              ),
            },
            {
              signature: eventSlicer<IAccessControl>(
                this.accessContract,
                this.accessContract
                  .getEvent('DefaultAdminTransferScheduled')
                  .fragment.format('full')
              ),
            },
            {
              signature: eventSlicer<IAccessControl>(
                this.accessContract,
                this.accessContract
                  .getEvent('DefaultAdminTransferCanceled')
                  .fragment.format('full')
              ),
            },
            {
              signature: eventSlicer<IAccessControl>(
                this.accessContract,
                this.accessContract
                  .getEvent('DefaultAdminDelayChangeScheduled')
                  .fragment.format('full')
              ),
            },
            {
              signature: eventSlicer<IAccessControl>(
                this.accessContract,
                this.accessContract
                  .getEvent('DefaultAdminDelayChangeCanceled')
                  .fragment.format('full')
              ),
            },
          ],
          function: [{signature: ''}],
        },
      },
      Governor: {
        resourceName: 'governor-monitor',
        abi: governorAbi,
        conditions: {
          event: [
            {
              signature: eventSlicer<IGovernor>(
                this.governorContract,
                this.governorContract
                  .getEvent('ProposalCanceled')
                  .fragment.format('full')
              ),
            },
            {
              signature: eventSlicer<IGovernor>(
                this.governorContract,
                this.governorContract
                  .getEvent('ProposalCreated')
                  .fragment.format('full')
              ),
            },
            {
              signature: eventSlicer<IGovernor>(
                this.governorContract,
                this.governorContract
                  .getEvent('ProposalExecuted')
                  .fragment.format('full')
              ),
            },
            {
              signature: eventSlicer<IGovernor>(
                this.governorContract,
                this.governorContract
                  .getEvent('VoteCast')
                  .fragment.format('full')
              ),
            },
            {
              signature: eventSlicer<IGovernor>(
                this.governorContract,
                this.governorContract
                  .getEvent('VoteCastWithParams')
                  .fragment.format('full')
              ),
            },
          ],
          function: [{signature: ''}],
        },
      },
      Proxies: {
        resourceName: 'proxies-monitor',
        abi: proxyAbi,
        conditions: {
          event: [
            {
              signature: eventSlicer<Proxies>(
                this.proxyContract,
                this.proxyContract
                  .getEvent('AdminChanged')
                  .fragment.format('full')
              ),
            },
            {
              signature: eventSlicer<Proxies>(
                this.proxyContract,
                this.proxyContract
                  .getEvent('BeaconUpgraded')
                  .fragment.format('full')
              ),
            },
            {
              signature: eventSlicer<Proxies>(
                this.proxyContract,
                this.proxyContract
                  .getEvent('DiamondCut')
                  .fragment.format('full')
              ),
            },
            {
              signature: eventSlicer<Proxies>(
                this.proxyContract,
                this.proxyContract.getEvent('Upgraded').fragment.format('full')
              ),
            },
          ],
          function: [],
        },
      },
    };
  }

  findContractsWithInterface = async (
    contractBase: Contract,
    records: DeploymentRecord[],
    additionalPropGetter?: (contract: BaseContract) => Record<string, unknown>
  ) => {
    process.stdout.write('findContractsWithInterface... ');
    const interfaceIdAC = getInterfaceID(contractBase.interface);

    const owners: string[] = [];
    const contracts = [];
    const contractConnected = contractBase.connect(this.provider);
    const contract165Connected = contract165Base.connect(this.provider);
    for (const record of records) {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      process.stdout.write(`Checking... ${record.address}`);
      const contractAttached = contractConnected.attach(record.address);

      const contract165Attached = contract165Connected.attach(
        record.address
      ) as IERC165;

      let supportsInterface = false;

      try {
        supportsInterface = await contract165Attached.supportsInterface(
          interfaceIdAC
        );
      } catch (e) {
        //
      }

      // console.log(supportsAC, supportsACDA);
      if (supportsInterface) {
        const additionalProps = additionalPropGetter?.(contractAttached);
        contracts.push({
          address: record.address,
          ...additionalProps,
        });
      }
    }
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    console.log('Found', contracts.length, ' contracts');
    return {
      contracts: contracts,
      priveledged: owners,
    };
  };
  findERC20Contracts = async (
    contractBase: Contract,
    records: DeploymentRecord[],
    additionalPropGetter?: (contract: BaseContract) => Record<string, unknown>
  ) => {
    process.stdout.write('findERC20Contracts... ');

    const contracts = [];
    const contractConnected = contractBase.connect(
      this.provider
    ) as unknown as IERC20Metadata;
    for (const record of records) {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      process.stdout.write(`Checking... ${record.address}`);
      const contractAttached = contractConnected.attach(
        record.address
      ) as unknown as IERC20Metadata;

      let supportsInterface = false;

      try {
        const allowance = contractAttached.allowance(ZeroAddress, ZeroAddress);
        const name = contractAttached.name();
        const symbol = contractAttached.symbol();
        const decimals = contractAttached.decimals();
        const totalSupply = contractAttached.totalSupply();
        const balanceOf = contractAttached.balanceOf(ZeroAddress);
        await Promise.all([
          allowance,
          name,
          symbol,
          decimals,
          totalSupply,
          balanceOf,
        ]);
        supportsInterface = true;
      } catch (e) {
        // If any function threew and error - that's not an ERC20
        supportsInterface = false;
      }

      // console.log(supportsAC, supportsACDA);
      if (supportsInterface) {
        const additionalProps = additionalPropGetter?.(contractAttached);
        contracts.push({
          address: record.address,
          ...additionalProps,
        });
      }
    }
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    console.log('Found', contracts.length, ' contracts');
    return {
      contracts: contracts,
      priveledged: [],
    };
  };

  standardMonitorGenerator = async (
    newMonitor: YBlockSentinel | YFortaSentinel,
    nDeployments: DeploymentRecord[],
    standardInterfaceName: StandardMonitroingInterfaces
  ) => {
    const _newMonitor = {...newMonitor};
    return this.generateMonitor(
      _newMonitor,
      nDeployments,
      new Contract(
        ZeroAddress,
        this.templatesMap[standardInterfaceName].abi ?? erc20abi
      ),
      standardInterfaceName
    );
  };
  generateMonitor = async (
    newMonitor: YBlockSentinel | YFortaSentinel,
    nDeployments: DeploymentRecord[],
    contractBase: Contract,
    standardInterfaceName: StandardMonitroingInterfaces,
    additionalPropGetter?: (contract: BaseContract) => Record<string, unknown>
  ) => {
    let priveledged: Set<string> = new Set<string>();
    const notifications: Record<string, YNotification> = {};
    newMonitor['risk-category'] = 'ACCESS-CONTROL';

    newMonitor.name = `${this.config.projectName} ${standardInterfaceName}`;
    newMonitor.paused = false;
    newMonitor.type =
      standardInterfaceName === 'attack-detector' ? 'FORTA' : 'BLOCK';
    if (newMonitor.type !== 'FORTA')
      newMonitor.abi = this.templatesMap[standardInterfaceName].abi;
    let contracts = [];
    if (standardInterfaceName === 'ERC20') {
      const result = await this.findERC20Contracts(
        contractBase,
        nDeployments,
        additionalPropGetter
      );
      contracts = result.contracts;
    } else if (
      standardInterfaceName === 'Proxies' ||
      standardInterfaceName === 'attack-detector'
    ) {
      contracts = nDeployments.map((nd) => {
        return {
          address: nd.address,
        };
      });
    } else {
      const result = await this.findContractsWithInterface(
        contractBase,
        nDeployments,
        additionalPropGetter
      );
      priveledged = new Set([...priveledged, ...result.priveledged]);
      contracts = result.contracts;
    }

    if (contracts.length > 0) {
      if (
        this.config.interfacesToNotify.standard &&
        this.config.interfacesToNotify.standard?.[standardInterfaceName]
      ) {
        const interfaceConfig = this.config.interfacesToNotify.standard[
          standardInterfaceName
        ] as InterfaceConfig;
        newMonitor.addresses = contracts.map((c) => c.address);
        const message =
          interfaceConfig.notifyConfig.message ?? getMessage('info-message');
        const notifyConfig: NotifyConfig = {
          ...interfaceConfig.notifyConfig,
          message: message,
        };
        const hashes = notifyConfig.channels.map((ch) => {
          if (!ch.name) ch.name = 'Access Control notifications';
          return ethers.hashMessage(JSON.stringify(ch));
        });
        const _nc = {...notifyConfig};
        _nc.channels = _nc.channels.map((ch, idx) => {
          return ('${self:resources.Resources.notifications.' +
            hashes[idx] +
            '}') as unknown as YNotification; //This is safe to do because we are creating YML reference string
        });

        hashes.forEach((hash, idx) => {
          if (!notifications[hash])
            notifications[hash] = notifyConfig.channels[idx];
        });

        newMonitor['notify-config'] = _nc;
        newMonitor.conditions =
          this.templatesMap[standardInterfaceName].conditions;
      }
    }
    return {
      newMonitor,
      notifications,
      priveledged,
      resourceName: this.templatesMap[standardInterfaceName].resourceName,
    };
  };
}

// const getSentinelBase = (standardInterface: StandardMonitroingInterfaces)
