import {ZeroAddress, ethers} from 'ethers';
import {TSentinel, TSentinelGetter} from '../../types';
import fs from 'fs';
import {eventSlicer} from '../../utils';
import {IGovernor} from '../../types/typechain';
import GovernorAbi from '../../../abis/IGovernor.json';
const governorContract = new ethers.Contract(
  ZeroAddress,
  GovernorAbi
) as unknown as IGovernor;

const defaultMessage = fs
  .readFileSync('./src/templates/messages/info-message.md', 'utf8')
  .toString();

export const governorMonitor =
  (name = 'Governor control monitor'): TSentinelGetter =>
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
              governorContract
                .getEvent('ProposalCanceled')
                .fragment.format('full')
            ),
          },
          {
            signature: eventSlicer<IGovernor>(
              governorContract,
              governorContract
                .getEvent('ProposalCreated')
                .fragment.format('full')
            ),
          },
          {
            signature: eventSlicer<IGovernor>(
              governorContract,
              governorContract
                .getEvent('ProposalExecuted')
                .fragment.format('full')
            ),
          },
          {
            signature: eventSlicer<IGovernor>(
              governorContract,
              governorContract.getEvent('VoteCast').fragment.format('full')
            ),
          },
          {
            signature: eventSlicer<IGovernor>(
              governorContract,
              governorContract
                .getEvent('VoteCastWithParams')
                .fragment.format('full')
            ),
          },
        ],
        function: [{signature: ''}],
      },
    };

    return {newMonitor, defaultMessage};
  };
