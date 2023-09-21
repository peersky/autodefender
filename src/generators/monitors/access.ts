import {
  FunctionFragment,
  JsonRpcProvider,
  ZeroAddress,
  ethers,
  isAddress,
} from 'ethers';
import {DefenderConfigType, NotifyConfig, DeploymentRecord} from '../../types';
import erc165abi from '../../../abis/IERC165.json';
import erc721abi from '../../../abis/IERC721.json';
import AccessControlAbi from '../../../abis/IAccessControl.json';
import ACDefaultAdminRulesAbi from '../../../abis/IAccessControlDefaultAdminRules.json';
import AcessControlEnumerableAbi from '../../../abis/AccessControlEnumerable.json';
import {Ownable} from '../../types/typechain/Ownable';
import {
  YBlockSentinel,
  YNotification,
  YSentinel,
} from '@openzeppelin/defender-serverless/lib/types';
import {eventSlicer, getInterfaceID, getMessage} from '../../utils';
import {AccessControlDefaultAdminRules} from '../../types/typechain/AccessControlDefaultAdminRules';
import {ERC165} from '../../types/typechain/ERC165';

const contract165Base = new ethers.Contract(
  ZeroAddress,
  erc165abi
) as unknown as ERC165;
const contractACBase = new ethers.Contract(
  ZeroAddress,
  AccessControlAbi
) as unknown as AccessControlDefaultAdminRules;

const contractACDABase = new ethers.Contract(
  ZeroAddress,
  ACDefaultAdminRulesAbi
) as unknown as AccessControlDefaultAdminRules;
const interfaceIdAC = getInterfaceID(contractACBase.interface);
const interfaceIdACDA = getInterfaceID(contractACDABase.interface);

const findAllAccessControl = async (
  records: DeploymentRecord[],
  config: DefenderConfigType,
  provider: JsonRpcProvider
) => {
  process.stdout.write('findAllAccessControl... ');

  const owners: string[] = [];
  const contracts: {address: string; isDefaultAdmin: boolean}[] = [];
  const contractACConnected = contractACBase.connect(provider);
  const contractACDAConnected = contractACDABase.connect(provider);
  const contract165Connected = contract165Base.connect(provider);
  for (const record of records) {
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(`Trying... ${record.address}`);
    const contractAccesible = contractACDAConnected.attach(
      record.address
    ) as AccessControlDefaultAdminRules;
    const contractAccesibleDA = contractACDAConnected.attach(
      record.address
    ) as AccessControlDefaultAdminRules;
    const contract165Attached = contract165Connected.attach(
      record.address
    ) as ERC165;
    // const supportsInterface =;
    // const base = new ethers.Contract(ZeroAddress, AccessControlAbi);

    let supportsAC = false;
    let supportsACDA = false;

    // console.log(
    //   'Checking if contract is AccessControl..',
    //   record.address,
    //   'interfaceIds:',
    //   interfaceIdAC,
    //   interfaceIdACDA
    // );
    try {
      supportsAC = await contract165Attached.supportsInterface(interfaceIdAC);
    } catch (e) {
      //
    }
    try {
      supportsACDA = await contract165Attached.supportsInterface(
        interfaceIdACDA
      );
    } catch (e) {
      //
    }
    // console.log(supportsAC, supportsACDA);
    if (supportsAC) {
      contracts.push({address: record.address, isDefaultAdmin: false});
    }
    if (supportsACDA) {
      const defaultAdmin = await contractAccesibleDA.defaultAdmin();
      contracts.push({address: record.address, isDefaultAdmin: true});
      if (!config.excludeAccounts.includes(defaultAdmin))
        owners.push(defaultAdmin);
    }
  }
  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
  console.log(
    'Found',
    contracts.length,
    'AccessControl enabled contracts'
    // and',
    // owners.length,
    // 'priveledged accounts'
  );
  return {
    contracts: contracts,
    priveledged: owners,
  };
};
export const generateAccessControlMonitor = async (
  newMonitor: YBlockSentinel,
  config: DefenderConfigType,
  nDeployments: DeploymentRecord[],
  priviledgedAccounts: Set<string>,
  provider: JsonRpcProvider
) => {
  newMonitor['risk-category'] = 'ACCESS-CONTROL';
  newMonitor.abi = ACDefaultAdminRulesAbi;
  newMonitor.name = `${config.projectName} Access Control`;
  newMonitor.paused = false;
  newMonitor.type = 'BLOCK';
  const notifications: Record<string, YNotification> = {};
  const {priveledged, contracts} = await findAllAccessControl(
    nDeployments,
    config,
    provider
  );
  if (contracts.length > 0) {
    priviledgedAccounts = new Set([...priviledgedAccounts, ...priveledged]);
    if (config.interfacesToNotify.standard?.['AccessControl']) {
      newMonitor.addresses = contracts.map((c) => c.address);
      const message =
        config.interfacesToNotify.standard?.['AccessControl']?.notifyConfig
          .message ?? getMessage('info-message');
      const notifyConfig: NotifyConfig = {
        ...config.interfacesToNotify.standard?.['AccessControl'].notifyConfig,
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
          '}') as any;
      });

      hashes.forEach((hash, idx) => {
        if (!notifications[hash])
          notifications[hash] = notifyConfig.channels[idx];
      });

      newMonitor['notify-config'] = _nc;
      newMonitor.conditions = {
        event: [
          {
            signature: eventSlicer<AccessControlDefaultAdminRules>(
              contractACDABase,
              contractACDABase
                .getEvent('RoleAdminChanged')
                .fragment.format('full')
            ),
          },
          {
            signature: eventSlicer<AccessControlDefaultAdminRules>(
              contractACDABase,
              contractACDABase.getEvent('RoleGranted').fragment.format('full')
            ),
          },
          {
            signature: eventSlicer<AccessControlDefaultAdminRules>(
              contractACDABase,
              contractACDABase.getEvent('RoleRevoked').fragment.format('full')
            ),
          },
          {
            signature: eventSlicer<AccessControlDefaultAdminRules>(
              contractACDABase,
              contractACDABase
                .getEvent('DefaultAdminDelayChangeCanceled')
                .fragment.format('full')
            ),
          },
          {
            signature: eventSlicer<AccessControlDefaultAdminRules>(
              contractACDABase,
              contractACDABase
                .getEvent('DefaultAdminDelayChangeScheduled')
                .fragment.format('full')
            ),
          },
          {
            signature: eventSlicer<AccessControlDefaultAdminRules>(
              contractACDABase,
              contractACDABase
                .getEvent('DefaultAdminTransferCanceled')
                .fragment.format('full')
            ),
          },
          {
            signature: eventSlicer<AccessControlDefaultAdminRules>(
              contractACDABase,
              contractACDABase
                .getEvent('DefaultAdminTransferScheduled')
                .fragment.format('full')
            ),
          },
        ],
        function: [{signature: ''}],
      };
    }
  }

  return {
    newMonitor,
    notifications,
    priviledgedAccounts,
    resourceName: 'access-control',
  };
};
