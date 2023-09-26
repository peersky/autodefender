import {
  AutotaskEvent,
  SentinelConditionResponse,
  SentinelConditionRequest,
  BlockTriggerEvent,
} from 'defender-autotask-utils';
import {ethers} from 'ethers';
export async function handler(event: AutotaskEvent) {
  const request = event?.request?.body as any as SentinelConditionRequest;

  const retval: SentinelConditionResponse = {matches: []};
  for (const _evt of request.events) {
    const evt = _evt as BlockTriggerEvent;
    const txFromChecksum = ethers.utils.getAddress(evt.transaction.from);
    console.log('Looking for a matches with:', txFromChecksum);
    if (evt.sentinel.addresses.includes(txFromChecksum)) {
      console.log('Matched: ', evt.transaction.from);
      retval.matches.push({
        hash: evt.hash,
        metadata: {
          title: 'Priviledged account activity',
          description: 'Transaction sent by account',
          account: txFromChecksum,
        },
      });
    }
  }
  return retval;
}
