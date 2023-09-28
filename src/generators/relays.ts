import {Network, Networks} from '@openzeppelin/defender-base-client';
import {DefenderConfigType} from '../types';
import {YRelayer} from '@openzeppelin/defender-serverless/lib/types';

const extractRelayName = (relativeYPath: string) => {
  return relativeYPath
    .replace('${self:resources.Resources.relayers.', '')
    .slice(0, -1);
};

export const generateRelay = (
  relativeYPath: string,
  networkKey: Network,
  config: DefenderConfigType
) => {
  let _relay = {};
  const relayKey = extractRelayName(relativeYPath);

  if (
    relayKey.startsWith(`DEFAULT_READER_`) &&
    Networks.includes(relayKey.replace('DEFAULT_READER_', '') as any)
  ) {
    _relay = {
      name: 'Default relay',
      network: networkKey,
      'min-balance': 0,
      'api-keys': [],
    };
  } else {
    if (!config?.relayers?.[relayKey])
      throw new Error(
        'Relay Key:' + relayKey + ' was not found in config.relayers'
      );
    {
      _relay = config.relayers[relayKey];
    }
  }
  const relay: YRelayer = _relay as YRelayer;
  return {relay, relayKey};
};
