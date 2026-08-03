export type TransactionSearchState = {
  readonly accountDomainIdFilter: string | null;
};

export const initialTransactionSearchState: TransactionSearchState = {
  accountDomainIdFilter: null,
};
