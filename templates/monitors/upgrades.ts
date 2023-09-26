import {ethers} from 'ethers';
import {TSentinel, TSentinelGetter} from '../../src/types';
import ProxiesAbi from '../../abis/Proxies.json';
import fs from 'fs';
import {eventSlicer} from '../../src/utils';
import {Proxies} from '../../src/types/typechain';

const proxyContract = new ethers.Contract(
  ethers.constants.AddressZero,
  ProxiesAbi
) as unknown as Proxies;

const defaultMessage = fs
  .readFileSync('./templates/messages/info-message.md', 'utf8')
  .toString();

export const upgradesMonitor =
  (
    name = 'Upgrades monitor'
  ): TSentinelGetter<Record<string, never>, Record<string, never>> =>
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
              'AdminChanged(address,address)'
            ),
          },
          {
            signature: eventSlicer<Proxies>(
              proxyContract,
              'BeaconUpgraded(address)'
            ),
          },
          {
            signature: eventSlicer<Proxies>(
              proxyContract,
              'DiamondCut((address,uint8,bytes4[])[],address,bytes)'
            ),
          },
          {
            signature: eventSlicer<Proxies>(proxyContract, 'Upgraded(address)'),
          },
        ],
        function: [],
      },
    };

    return {newMonitor, defaultMessage};
  };
