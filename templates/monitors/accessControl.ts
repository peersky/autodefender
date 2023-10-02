import {ethers} from 'ethers';
import {TSentinel, TSentinelGetter} from '../../src/types';
import {eventSlicer} from '../../src/utils';
import {AccessControlDefaultAdminRules} from '../../src/types/typechain';
import AccessControlAbi from '../../abis/AccessControlDefaultAdminRules.json';
import {defaultMessage} from '../messages';
const accessContract = new ethers.Contract(
  ethers.constants.AddressZero,
  AccessControlAbi
) as unknown as AccessControlDefaultAdminRules;

export const accessMonitor =
  (
    name = 'Access control monitor'
  ): TSentinelGetter<Record<string, never>, Record<string, never>> =>
  async () => {
    const newMonitor: TSentinel = {
      'risk-category': 'ACCESS-CONTROL',
      abi: AccessControlAbi,
      name: name,
      paused: false,
      type: 'BLOCK',
      conditions: {
        event: [
          {
            signature: eventSlicer<AccessControlDefaultAdminRules>(
              accessContract,
              'RoleAdminChanged(bytes32,bytes32,bytes32)'
            ),
          },
          {
            signature: eventSlicer<AccessControlDefaultAdminRules>(
              accessContract,
              'RoleGranted(bytes32,address,address)'
            ),
          },
          {
            signature: eventSlicer<AccessControlDefaultAdminRules>(
              accessContract,
              'RoleRevoked(bytes32,address,address)'
            ),
          },
          {
            signature: eventSlicer<AccessControlDefaultAdminRules>(
              accessContract,
              'DefaultAdminDelayChangeCanceled()'
            ),
          },
          {
            signature: eventSlicer<AccessControlDefaultAdminRules>(
              accessContract,
              'DefaultAdminDelayChangeScheduled(uint48,uint48)'
            ),
          },
          {
            signature: eventSlicer<AccessControlDefaultAdminRules>(
              accessContract,
              'DefaultAdminTransferCanceled()'
            ),
          },
          {
            signature: eventSlicer<AccessControlDefaultAdminRules>(
              accessContract,
              'DefaultAdminTransferScheduled(address,uint48)'
            ),
          },
        ],
        function: [{signature: ''}],
      },
    };

    return {newMonitor, defaultMessage};
  };
