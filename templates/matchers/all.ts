import {AddressInfo, MatcherFindings} from '../../src/types';

export const all =
  (excludeAccounts: string[] = []) =>
  async (records: AddressInfo[]): Promise<MatcherFindings[]> => {
    const contracts: MatcherFindings[] = records
      .filter((r) => !excludeAccounts?.includes(r.address))
      .map((fv) => ({account: fv}));

    return contracts;
  };
