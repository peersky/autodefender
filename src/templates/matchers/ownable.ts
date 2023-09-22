import {JsonRpcProvider, ZeroAddress, ethers, isAddress} from 'ethers';
import {AddressInfoProps} from '../../types';
import OwnableAbi from '../../../abis/Ownable.json';
import {Ownable} from '../../types/typechain/Ownable';

const contractOwnableBase = new ethers.Contract(
  ZeroAddress,
  OwnableAbi
) as unknown as Ownable;
export const findAllOwnable =
  () =>
  async (
    records: AddressInfoProps[],
    provider: JsonRpcProvider,
    excludeAccounts?: string[]
    // config: DefenderConfigType,
  ): Promise<AddressInfoProps[]> => {
    const owners: string[] = [];
    const ownable: AddressInfoProps[] = [];
    const contractOwnableConnected = contractOwnableBase.connect(provider);
    for (const record of records) {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      //   process.stdout.write(`Checking... ${record.address}`);
      // let isOwnable = false;
      const contractOwnable = contractOwnableConnected.attach(
        record.address
      ) as Ownable;
      try {
        await contractOwnable.owner().then((owner) => {
          const isOwnable = isAddress(owner);

          if (isOwnable) {
            if (!owners.includes(owner) && !excludeAccounts?.includes(owner))
              owners.push(owner);

            if (
              !ownable.some((o) => o.address === record.address) &&
              !excludeAccounts?.includes(record.address)
            ) {
              // console.log(record.address);
              ownable.push({address: record.address});
            }
          }
        });
      } catch (e: any) {
        // console.log(e.message);
      }
    }
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    console.log('Found ', ownable.length, 'Ownable contracts');
    return ownable;
  };
