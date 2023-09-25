import {Contract, ethers, providers} from 'ethers';
import {AddressInfoProps} from '../../types';
import erc20abi from '../../../abis/IERC20Metadata.json';

import {IERC20Metadata} from '../../types/typechain/IERC20Metadata';

const erc20contract = new Contract(
  ethers.constants.AddressZero,
  erc20abi
) as unknown as IERC20Metadata;
export const findERC20Contracts =
  (excludeAccounts?: string[]) =>
  async (
    records: AddressInfoProps[],
    provider: providers.JsonRpcProvider
  ): Promise<AddressInfoProps[]> => {
    process.stdout.write('findERC20Contracts... ');

    const contracts: AddressInfoProps[] = [];
    const contractConnected = erc20contract.connect(
      provider
    ) as unknown as IERC20Metadata;
    for (const record of records) {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      //   process.stdout.write(`Checking... ${record.address}`);
      const contractAttached = contractConnected.attach(
        record.address
      ) as unknown as IERC20Metadata;

      let supportsInterface = false;

      try {
        const allowance = contractAttached.allowance(
          ethers.constants.AddressZero,
          ethers.constants.AddressZero
        );
        const name = contractAttached.name();
        const symbol = contractAttached.symbol();
        const decimals = contractAttached.decimals();
        const totalSupply = contractAttached.totalSupply();
        const balanceOf = contractAttached.balanceOf(
          ethers.constants.AddressZero
        );
        await Promise.all([
          allowance,
          name,
          symbol,
          decimals,
          totalSupply,
          balanceOf,
        ]);
        supportsInterface = true;
      } catch (e) {
        // If any function threew and error - that's not an ERC20
        supportsInterface = false;
      }

      // console.log(supportsAC, supportsACDA);
      if (supportsInterface && !excludeAccounts?.includes(record.address)) {
        contracts.push({
          address: record.address,
        });
      }
    }
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    console.log('Found', contracts.length, 'erc20 contracts');
    return contracts;
  };
