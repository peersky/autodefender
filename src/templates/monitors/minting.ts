import {ethers} from 'ethers';
import {TSentinel, TSentinelGetter} from '../../types';
import ERC1155Abi from '../../../abis/IERC1155.json';
import ERC721Abi from '../../../abis/IERC721.json';
import ERC20Abi from '../../../abis/IERC20.json';
import {IERC1155, IERC20Metadata, IERC721} from '../../types/typechain';

import fs from 'fs';
import {eventSlicer} from '../../utils';

const erc20contract = new ethers.Contract(
  ethers.constants.AddressZero,
  ERC20Abi
) as unknown as IERC20Metadata;
const erc1155contract = new ethers.Contract(
  ethers.constants.AddressZero,
  ERC1155Abi
) as unknown as IERC1155;
const erc721contract = new ethers.Contract(
  ethers.constants.AddressZero,
  ERC721Abi
) as unknown as IERC721;

const defaultMessage = fs
  .readFileSync('./src/templates/messages/info-message.md', 'utf8')
  .toString();
type SupportedInterfaces = 'ERC20' | 'ERC721' | 'ERC1155';
export const mintMonitor =
  (
    type: SupportedInterfaces,
    threshold = '0',
    name?: string,
    to?: string[]
  ): TSentinelGetter =>
  async () => {
    let abi;
    switch (type) {
      case 'ERC1155':
        abi = ERC1155Abi;
        break;
      case 'ERC20':
        abi = ERC20Abi;
        break;
      case 'ERC721':
        abi = ERC721Abi;
    }
    const newMonitor: TSentinel = {
      'risk-category': 'FINANCIAL',
      abi: abi,
      name: name ?? `${type} minting monitor`,
      paused: false,
      type: 'BLOCK',
      conditions: conditions(type, threshold, to),
    };

    return {newMonitor, defaultMessage};
  };

const conditions = (
  type: SupportedInterfaces,
  threshold = '0',
  to?: string[]
) => {
  const map: Record<SupportedInterfaces, any> = {
    ERC20: {
      event: [
        {
          signature: eventSlicer<IERC20Metadata>(
            erc20contract,
            erc20contract.interface.getEvent('Transfer').format('full')
          ),
          expression: `from==${ethers.constants.AddressZero} AND value > ${threshold}`,
        },
      ],
      function: [{signature: ''}],
    },
    ERC1155: {
      event: [
        {
          signature: eventSlicer<IERC1155>(
            erc1155contract,
            erc1155contract.interface.getEvent('TransferSingle').format('full')
          ),
          expression: `from==${ethers.constants.AddressZero} AND value > ${threshold}`,
        },
      ],
      function: [{signature: ''}],
    },
    ERC721: {
      event: [
        {
          signature: eventSlicer<IERC721>(
            erc721contract,
            erc721contract.interface.getEvent('Transfer').format('full')
          ),
          expression: `from==${ethers.constants.AddressZero} AND tokenId > ${threshold}`,
        },
      ],
      function: [{signature: ''}],
    },
  };
  let retval;
  if (to) {
    retval = {...map[type]};
    retval.event[0].expression += ` AND to==${to[0]}`;
    if (to.length > 1) {
      for (let i = 1; i < to.length; i++) {
        retval.event.push(map[type].event[0]);
        retval.event[i].expression += ` AND to==${to[i]}`;
      }
    }
  } else {
    retval = map[type];
  }
  return retval;
};
