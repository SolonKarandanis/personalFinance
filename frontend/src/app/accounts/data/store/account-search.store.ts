import { computed, inject } from '@angular/core';
import { signalStore, withComputed, withMethods, withProps } from '@ngrx/signals';
import { AccountRepository } from '../repositories/account.repository';
import { resourceCallState } from '@core/store/features/resource-call-state';

// GET /accounts takes no query params — there's no search criteria to hold,
// so this store has no state of its own beyond the list httpResource.
export const AccountSearchStore = signalStore(
  { providedIn: 'root' },
  withProps(() => {
    const accountRepository = inject(AccountRepository);
    const accountsResource = accountRepository.listAccounts();
    return { accountRepository, accountsResource };
  }),
  withComputed(({ accountsResource }) => ({
    accounts: computed(() => accountsResource.value() ?? []),
    ...resourceCallState(accountsResource),
  })),
  withMethods(({ accountsResource }) => ({
    reload(): void {
      accountsResource.reload();
    },
  })),
);
