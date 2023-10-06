import {
  AutotaskEvent,
  SentinelConditionResponse,
} from 'defender-autotask-utils';
import {DefenderRelayProvider} from 'defender-relay-client/lib/ethers';
import {ethers} from 'ethers';
import {ScopedSecretsProvider} from './utils/scopedSecrets';

export async function handler(event: AutotaskEvent) {
  const match = event?.request?.body as any;
  if (!event.credentials) {
    throw new Error('Account balance checker action must have relay connected');
  }
  const provider = new DefenderRelayProvider(event as any); //This must be addressed in typescript package
  const scopedSecrets = ScopedSecretsProvider(event);

  const _threshold = scopedSecrets[`LOW_ETH_TRESHOLD`];
  if (!_threshold) throw new Error('Eth threshold not set');

  const retval: SentinelConditionResponse = {matches: []};
  for (const evt of match.events) {
    console.log('scanning tx of hash: ', evt.hash);
    for (const address of evt.matchedAddresses) {
      console.log('checking balance of ', address);
      const balance = await provider.getBalance(address);
      const threshold = ethers.utils.parseEther(_threshold);
      console.log('balance:', ethers.utils.formatEther(balance));
      console.log('threshold:', ethers.utils.formatEther(threshold));
      console.log('threshold.gt(balance)', threshold > balance);
      if (threshold.gt(balance)) {
        retval.matches.push({
          hash: evt.hash,
          metadata: {
            address: address,
            balance: balance,
            threshold: ethers.utils.formatEther(threshold),
          },
        });
      }
    }
  }
  return retval;
}

export interface expectedSecrets {
  LOW_ETH_THRESHOLD: string;
}
export const SecretRequires: expectedSecrets = {LOW_ETH_THRESHOLD: '0'};
