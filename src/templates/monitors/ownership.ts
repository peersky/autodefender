import {ethers} from 'ethers';
import {TSentinel, TSentinelGetter} from '../../types';
import OwnableAbi from '../../../abis/Ownable.json';
import {Ownable} from '../../types/typechain/Ownable';

import fs from 'fs';
import {eventSlicer} from '../../utils';

const contractOwnableBase = new ethers.Contract(
  ethers.constants.AddressZero,
  OwnableAbi
) as unknown as Ownable;

const defaultMessage = fs
  .readFileSync('./src/templates/messages/info-message.md', 'utf8')
  .toString();

export const generateOwnableMonitor =
  (name = 'Ownership monitor'): TSentinelGetter =>
  async () => {
    const newMonitor: TSentinel = {
      'risk-category': 'ACCESS-CONTROL',
      abi: OwnableAbi,
      name: name,
      paused: false,
      type: 'BLOCK',
      conditions: {
        event: [
          {
            signature: eventSlicer<Ownable>(
              contractOwnableBase,
              'OwnershipTransferred'
            ),
          },
        ],
        function: [{signature: ''}],
      },
    };

    return {newMonitor, defaultMessage};
  };
