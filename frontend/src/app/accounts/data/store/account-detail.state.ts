export type AccountDetailState = {
  readonly selectedDomainId: string | null;
};

export const initialAccountDetailState: AccountDetailState = {
  selectedDomainId: null,
};
