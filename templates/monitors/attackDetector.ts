import {TFortaSentinel, TSentinelGetter} from '../../src/types';
import OwnableAbi from '../../abis/Ownable.json';
import {fortaMessage} from '../messages';

export const attackDetectorMonitor =
  (
    name = 'Attack detector'
  ): TSentinelGetter<Record<string, never>, Record<string, never>> =>
  async () => {
    const newMonitor: TFortaSentinel = {
      'risk-category': 'SUSPICIOUS',
      abi: OwnableAbi,
      name: name,
      paused: false,
      type: 'FORTA',
      conditions: {
        severity: 1,
        'min-scanner-count': 2,
        'alert-ids': [
          'ATTACK-DETECTOR-1',
          'ATTACK-DETECTOR-2',
          'ATTACK-DETECTOR-3',
          'ATTACK-DETECTOR-4',
          'ATTACK-DETECTOR-5',
        ],
      },
      'agent-ids': [
        '0x80ed808b586aeebe9cdd4088ea4dea0a8e322909c0e4493c993e060e89c09ed1',
      ],
    };

    return {newMonitor, defaultMessage: fortaMessage};
  };
