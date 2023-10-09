import {AddressInfo, MatcherFindings} from '../../types';

export const all =
  (excludeAccounts: string[] = [], limit?: number) =>
  async (records: AddressInfo[]): Promise<MatcherFindings[]> => {
    const contracts: MatcherFindings[] = records
      .filter((r) => !excludeAccounts?.includes(r.address))
      .map((fv) => ({account: fv}));

    return limit ? contracts.slice(0, limit) : contracts;
  };
