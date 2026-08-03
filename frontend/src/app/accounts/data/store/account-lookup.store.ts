import { computed, inject } from '@angular/core';
import { signalStore, withComputed, withProps } from '@ngrx/signals';
import { Account, AccountRepository } from '../repositories/account.repository';
import { resourceCallState } from '@core/store/features/resource-call-state';

// Dropdown data for other domains' forms (e.g. picking an account for a
// transaction) — a different UI job from AccountSearchStore's "manage my
// accounts" list, so a separate store per the granularity rule, even though
// both wrap the same GET /accounts endpoint.
export const AccountLookupStore = signalStore(
  { providedIn: 'root' },
  withProps(() => {
    const accountRepository = inject(AccountRepository);
    const accountsResource = accountRepository.listAccounts();
    return { accountRepository, accountsResource };
  }),
  withComputed(({ accountsResource }) => {
    const callState = resourceCallState(accountsResource);
    return {
      accounts: computed<Account[]>(() => accountsResource.value() ?? []),
      loading: callState.loading,
      loaded: callState.loaded,
      error: callState.error,
      status: callState.status,
    };
  }),
);
