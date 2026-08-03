export type TransactionDetailState = {
  readonly selectedDomainId: string | null;
};

export const initialTransactionDetailState: TransactionDetailState = {
  selectedDomainId: null,
};
