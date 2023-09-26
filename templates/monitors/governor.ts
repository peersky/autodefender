import {ethers} from 'ethers';
import {TSentinel, TSentinelGetter} from '../../src/types';
import fs from 'fs';
import {eventSlicer} from '../../src/utils';
import {IGovernor} from '../../src/types/typechain';
import GovernorAbi from '../../abis/IGovernor.json';
const governorContract = new ethers.Contract(
  ethers.constants.AddressZero,
  GovernorAbi
) as unknown as IGovernor;

const defaultMessage = fs
  .readFileSync('./templates/messages/info-message.md', 'utf8')
  .toString();

export const governorMonitor =
  (
    name = 'Governor control monitor'
  ): TSentinelGetter<Record<string, never>, Record<string, never>> =>
  async () => {
    const newMonitor: TSentinel = {
      'risk-category': 'GOVERNANCE',
      abi: GovernorAbi,
      name: name,
      paused: false,
      type: 'BLOCK',
      conditions: {
        event: [
          {
            signature: eventSlicer<IGovernor>(
              governorContract,
              governorContract.interface
                .getEvent('ProposalCanceled')
                .format('full')
            ),
          },
          {
            signature: eventSlicer<IGovernor>(
              governorContract,
              governorContract.interface
                .getEvent('ProposalCreated')
                .format('full')
            ),
          },
          {
            signature: eventSlicer<IGovernor>(
              governorContract,
              governorContract.interface
                .getEvent('ProposalExecuted')
                .format('full')
            ),
          },
          {
            signature: eventSlicer<IGovernor>(
              governorContract,
              governorContract.interface.getEvent('VoteCast').format('full')
            ),
          },
          {
            signature: eventSlicer<IGovernor>(
              governorContract,
              governorContract.interface
                .getEvent('VoteCastWithParams')
                .format('full')
            ),
          },
        ],
        function: [{signature: ''}],
      },
    };

    return {newMonitor, defaultMessage};
  };
