import {ZeroAddress, ethers} from 'ethers';
import {TSentinel, TSentinelGetter} from '../../types';
import fs from 'fs';
import {eventSlicer} from '../../utils';
import {AccessControlDefaultAdminRules} from '../../types/typechain';
import AccessControlAbi from '../../../abis/AccessControlDefaultAdminRules.json';
const accessContract = new ethers.Contract(
  ZeroAddress,
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
              accessContract
                .getEvent('RoleAdminChanged')
                .fragment.format('full')
            ),
          },
          {
            signature: eventSlicer<AccessControlDefaultAdminRules>(
              accessContract,
              accessContract.getEvent('RoleGranted').fragment.format('full')
            ),
          },
          {
            signature: eventSlicer<AccessControlDefaultAdminRules>(
              accessContract,
              accessContract
                .getEvent('RoleAdminChanged')
                .fragment.format('full')
            ),
          },
          {
            signature: eventSlicer<AccessControlDefaultAdminRules>(
              accessContract,
              accessContract
                .getEvent('DefaultAdminTransferScheduled')
                .fragment.format('full')
            ),
          },
          {
            signature: eventSlicer<AccessControlDefaultAdminRules>(
              accessContract,
              accessContract
                .getEvent('DefaultAdminTransferCanceled')
                .fragment.format('full')
            ),
          },
          {
            signature: eventSlicer<AccessControlDefaultAdminRules>(
              accessContract,
              accessContract
                .getEvent('DefaultAdminDelayChangeScheduled')
                .fragment.format('full')
            ),
          },
          {
            signature: eventSlicer<AccessControlDefaultAdminRules>(
              accessContract,
              accessContract
                .getEvent('DefaultAdminDelayChangeCanceled')
                .fragment.format('full')
            ),
          },
        ],
        function: [{signature: ''}],
      },
    };

    return {newMonitor, defaultMessage};
  };
