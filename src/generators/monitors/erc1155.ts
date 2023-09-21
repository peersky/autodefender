import {JsonRpcProvider, ZeroAddress, ethers} from 'ethers';
import {DefenderConfigType, NotifyConfig, DeploymentRecord} from '../../types';
import IERC1155Abi from '../../../abis/IERC1155.json';
import ERC165Abi from '../../../abis/ERC165.json';
import {
  YBlockSentinel,
  YNotification,
  YSentinel,
} from '@openzeppelin/defender-serverless/lib/types';
import {eventSlicer, getInterfaceID, getMessage} from '../../utils';
import {ERC165} from '../../types/typechain/ERC165';
import {IERC1155} from '../../types/typechain/IERC1155';

const contractERC165Base = new ethers.Contract(
  ZeroAddress,
  ERC165Abi
) as unknown as ERC165;
const contractBase = new ethers.Contract(
  ZeroAddress,
  IERC1155Abi
) as unknown as IERC1155;
const _interface = getInterfaceID(contractBase.interface);
const findAllERC1155 = async (
  records: DeploymentRecord[],
  config: DefenderConfigType,
  provider: JsonRpcProvider
) => {
  const owners: string[] = [];
  const contracts: {address: string; isDefaultAdmin: boolean}[] = [];
  const contract165Connected = contractERC165Base.connect(provider);
  for (const record of records) {
    const contract165Attached = contract165Connected.attach(
      record.address
    ) as ERC165;
    let supportsInterface = false;

    try {
      supportsInterface = await contract165Attached.supportsInterface(
        _interface
      );
    } catch (e) {
      //
    }

    if (supportsInterface) {
      contracts.push({address: record.address, isDefaultAdmin: false});
    }
  }
  console.log('Found', contracts.length, 'ERC1155 contracts');
  return {
    contracts: contracts,
    priveledged: owners,
  };
};
export const generateERC1155Monitor = async (
  newMonitor: YBlockSentinel,
  config: DefenderConfigType,
  nDeployments: DeploymentRecord[],
  priviledgedAccounts: Set<string>,
  provider: JsonRpcProvider,
  notifications: Record<string, YNotification>,
  monitors: Record<string, YSentinel> = {}
): Promise<{
  priviledgedAccounts: Set<string>;
  notifications: Record<string, YNotification>;
  monitors: Record<string, YSentinel>;
}> => {
  newMonitor['risk-category'] = 'ACCESS-CONTROL';
  newMonitor.abi = IERC1155Abi;
  newMonitor.name = `${config.projectName} ERC1155`;
  newMonitor.paused = false;
  newMonitor.type = 'BLOCK';
  const {contracts} = await findAllERC1155(nDeployments, config, provider);
  if (contracts.length > 0) {
    if (config.interfacesToNotify.standard?.['ERC1155']) {
      newMonitor.addresses = contracts.map((c) => c.address);
      const message =
        config.interfacesToNotify.standard?.['ERC1155']?.notifyConfig.message ??
        getMessage('info-message');
      const notifyConfig: NotifyConfig = {
        ...config.interfacesToNotify.standard?.['ERC1155'].notifyConfig,
        message: message,
      };
      const hashes = notifyConfig.channels.map((ch) => {
        if (!ch.name) ch.name = 'ERC1155 notifications';
        return ethers.hashMessage(JSON.stringify(ch));
      });
      const _nc = {...notifyConfig};
      _nc.channels = _nc.channels.map((ch, idx) => {
        return ('${self:resources.Resources.notifications.' +
          hashes[idx] +
          '}') as unknown as YNotification;
      });

      hashes.forEach((hash, idx) => {
        if (!notifications[hash])
          notifications[hash] = notifyConfig.channels[idx];
      });
      newMonitor['notify-config'] = _nc;
      newMonitor.conditions = {
        event: [
          {
            signature: eventSlicer<IERC1155>(contractBase, 'TransferSingle'),
            expression: `from==${ZeroAddress} AND value > ${config.interfacesToNotify.standard?.['ERC1155'].config['largeMintValue']}`,
          },
        ],
        function: [{signature: ''}],
      };
      monitors['erc1155-monitor'] = newMonitor;
    }
  }
  return {monitors, notifications, priviledgedAccounts};
};
