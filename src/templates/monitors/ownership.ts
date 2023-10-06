import {ethers} from 'ethers';
import {TSentinel, TSentinelGetter} from '../../types';
import OwnableAbi from '../../abis/Ownable.json';
import {Ownable} from '../../types/typechain/Ownable';
import {defaultMessage} from '../messages';
import {eventSlicer} from '../../utils';

const contractOwnableBase = new ethers.Contract(
  ethers.constants.AddressZero,
  OwnableAbi
) as unknown as Ownable;

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
