import {ActionSpec, TSentinel, TSentinelGetter} from '../../src/types';
import {SecretRequires} from '../functions/ethBalanceCheck';
import fs from 'fs';

const defaultMessage = fs
  .readFileSync('./templates/messages/info-message.md', 'utf8')
  .toString();

export const accountEthMonitor =
  (
    threshold: string,
    name = 'Eth Balance monitor',
    trigger: ActionSpec = {params: {}, path: ''}
  ): TSentinelGetter<typeof SecretRequires, typeof trigger.params> =>
  async (a, p, sentinelNetwork) => {
    const newMonitor: TSentinel = {
      'risk-category': 'FINANCIAL',
      name: name,
      paused: false,
      type: 'BLOCK',
      conditions: {
        event: [{signature: ''}],
        function: [{signature: ''}],
      },
      'autotask-condition': './templates/functions/ethBalanceCheck/index.js',
      'autotask-trigger': trigger.path ? trigger.path : undefined,
    };
    SecretRequires;

    return {
      newMonitor,
      defaultMessage,
      actionsParams: {
        condition: {
          relayNetwork: sentinelNetwork,
          secrets: {LOW_ETH_THRESHOLD: threshold},
        },
        trigger: trigger
          ? {relayNetwork: trigger.params.relayNetwork, secrets: trigger.params}
          : undefined,
      },
    };
  };
