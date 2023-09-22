import {Contract, JsonRpcProvider, ZeroAddress, ethers} from 'ethers';
import {AbiItem, AddressInfoProps} from '../../types';
import erc165abi from '../../../abis/IERC165.json';
import {getInterfaceID} from '../../utils';

import {IERC165} from '../../types/typechain/IERC165';

const contract165Base = new ethers.Contract(
  ZeroAddress,
  erc165abi
) as unknown as IERC165;

export const findContractsWithInterface =
  (abiOrInterffaceId: AbiItem | string, excludeAccounts?: string[]) =>
  async (
    records: AddressInfoProps[],
    provider: JsonRpcProvider
  ): Promise<AddressInfoProps[]> => {
    process.stdout.write('findContractsWithInterface... ');
    let interfaceId;
    if (typeof abiOrInterffaceId === 'string') {
      interfaceId = abiOrInterffaceId;
    } else {
      const contractBase = new Contract(ZeroAddress, abiOrInterffaceId);
      interfaceId = getInterfaceID(contractBase.interface);
    }

    const contracts = [];
    const contract165Connected = contract165Base.connect(provider);
    for (const record of records) {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      // process.stdout.write(`Checking... ${record.address}`);

      const contract165Attached = contract165Connected.attach(
        record.address
      ) as IERC165;

      let supportsInterface = false;

      try {
        supportsInterface = await contract165Attached.supportsInterface(
          interfaceId
        );
      } catch (e) {
        //
      }
      if (supportsInterface && !excludeAccounts?.includes(record.address)) {
        contracts.push({
          address: record.address,
        });
      }
    }
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    console.log(
      'Found',
      contracts.length,
      ' contracts for interfaceId',
      interfaceId
    );
    return contracts;
  };

export const findContractsWithInterfaces =
  (abisOrIds: AbiItem[] | string[], excludeAccounts?: string[]) =>
  async (
    records: AddressInfoProps[],
    provider: JsonRpcProvider
  ): Promise<AddressInfoProps[]> => {
    const results = [];
    let abiorId: AbiItem | string;
    for (abiorId of abisOrIds) {
      results.push(
        await findContractsWithInterface(abiorId, excludeAccounts)(
          records,
          provider
        )
      );
    }
    return [...new Set(results.flat())];
  };
