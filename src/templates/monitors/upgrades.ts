import {ZeroAddress, ethers} from 'ethers';
import {TSentinel, TSentinelGetter} from '../../types';
import ProxiesAbi from '../../../abis/Proxies.json';
import fs from 'fs';
import {eventSlicer} from '../../utils';
import {Proxies} from '../../types/typechain';

const proxyContract = new ethers.Contract(
  ZeroAddress,
  ProxiesAbi
) as unknown as Proxies;

const defaultMessage = fs
  .readFileSync('./src/templates/messages/info-message.md', 'utf8')
  .toString();

export const upgradesMonitor =
  (name = 'Upgrades monitor'): TSentinelGetter =>
  async () => {
    const newMonitor: TSentinel = {
      'risk-category': 'TECHNICAL',
      abi: ProxiesAbi,
      name: name,
      paused: false,
      type: 'BLOCK',
      conditions: {
        event: [
          {
            signature: eventSlicer<Proxies>(
              proxyContract,
              proxyContract.getEvent('AdminChanged').fragment.format('full')
            ),
          },
          {
            signature: eventSlicer<Proxies>(
              proxyContract,
              proxyContract.getEvent('BeaconUpgraded').fragment.format('full')
            ),
          },
          {
            signature: eventSlicer<Proxies>(
              proxyContract,
              proxyContract.getEvent('DiamondCut').fragment.format('full')
            ),
          },
          {
            signature: eventSlicer<Proxies>(
              proxyContract,
              proxyContract.getEvent('Upgraded').fragment.format('full')
            ),
          },
        ],
        function: [],
      },
    };

    return {newMonitor, defaultMessage};
  };
