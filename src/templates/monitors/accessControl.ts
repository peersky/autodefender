import {ethers} from 'ethers';
import {TSentinel, TSentinelGetter} from '../../types';
import fs from 'fs';
import {eventSlicer} from '../../utils';
import {AccessControlDefaultAdminRules} from '../../types/typechain';
import AccessControlAbi from '../../../abis/AccessControlDefaultAdminRules.json';
const accessContract = new ethers.Contract(
  ethers.constants.AddressZero,
  AccessControlAbi
) as unknown as AccessControlDefaultAdminRules;

const defaultMessage = fs
  .readFileSync('./src/templates/messages/info-message.md', 'utf8')
  .toString();

export const accessMonitor =
  (name = 'Access control monitor'): TSentinelGetter =>
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
              accessContract.interface
                .getEvent('RoleAdminChanged')
                .format('full')
            ),
          },
          {
            signature: eventSlicer<AccessControlDefaultAdminRules>(
              accessContract,
              accessContract.interface.getEvent('RoleGranted').format('full')
            ),
          },
          {
            signature: eventSlicer<AccessControlDefaultAdminRules>(
              accessContract,
              accessContract.interface
                .getEvent('RoleAdminChanged')
                .format('full')
            ),
          },
          {
            signature: eventSlicer<AccessControlDefaultAdminRules>(
              accessContract,
              accessContract.interface
                .getEvent('DefaultAdminTransferScheduled')
                .format('full')
            ),
          },
          {
            signature: eventSlicer<AccessControlDefaultAdminRules>(
              accessContract,
              accessContract.interface
                .getEvent('DefaultAdminTransferCanceled')
                .format('full')
            ),
          },
          {
            signature: eventSlicer<AccessControlDefaultAdminRules>(
              accessContract,
              accessContract.interface
                .getEvent('DefaultAdminDelayChangeScheduled')
                .format('full')
            ),
          },
          {
            signature: eventSlicer<AccessControlDefaultAdminRules>(
              accessContract,
              accessContract.interface
                .getEvent('DefaultAdminDelayChangeCanceled')
                .format('full')
            ),
          },
        ],
        function: [{signature: ''}],
      },
    };

    return {newMonitor, defaultMessage};
  };
