import {ethers, providers} from 'ethers';
import {AddressInfo, MatcherFindings} from '../../src/types';
import OwnableAbi from '../../abis/Ownable.json';
import {Ownable} from '../../src/types/typechain/Ownable';
import {isAddress} from 'ethers/lib/utils';

const contractOwnableBase = new ethers.Contract(
  ethers.constants.AddressZero,
  OwnableAbi
) as unknown as Ownable;
export const findAllOwnable =
  () =>
  async (
    records: AddressInfo[],
    provider: providers.JsonRpcProvider,
    excludeAccounts?: string[]
    // config: DefenderConfigType,
  ): Promise<MatcherFindings[]> => {
    const owners: string[] = [];
    const findings: MatcherFindings[] = [];
    // const ownable: {
    //   findings: AddressInfo;
    //   priviledgedAccountFindings: AddressInfo[];
    // }[] = [];
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
              findings.push({
                account: {address: record.address},
                related:
                  !excludeAccounts?.includes(owner) &&
                  owner !== ethers.constants.AddressZero
                    ? [
                        {
                          address: owner,
                          relationship: 'Priveledged',
                          to: record.address,
                        },
                      ]
                    : [],
              });
          }
        });
      } catch (e: any) {
        // console.log(e.message);
      }
    }
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    console.log('Found ', findings.length, 'Ownable contracts');
    return findings;
  };
