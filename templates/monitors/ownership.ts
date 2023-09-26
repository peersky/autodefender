import {ethers} from 'ethers';
import {TSentinel, TSentinelGetter} from '../../src/types';
import OwnableAbi from '../../abis/Ownable.json';
import {Ownable} from '../../src/types/typechain/Ownable';

import fs from 'fs';
import {eventSlicer} from '../../src/utils';

const contractOwnableBase = new ethers.Contract(
  ethers.constants.AddressZero,
  OwnableAbi
) as unknown as Ownable;

const defaultMessage = fs
  .readFileSync('./templates/messages/info-message.md', 'utf8')
  .toString();

export const generateOwnableMonitor =
  (
    name = 'Ownership monitor'
  ): TSentinelGetter<Record<string, never>, Record<string, never>> =>
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
            // signature: contractOwnableBase.interface
            //   .getEvent('OwnershipTransferred')
            //   .format('minimal'),
            signature: eventSlicer<Ownable>(
              contractOwnableBase,
              'OwnershipTransferred(address,address)'
            ),
          },
        ],
        function: [{signature: ''}],
      },
    };

    return {newMonitor, defaultMessage};
  };
