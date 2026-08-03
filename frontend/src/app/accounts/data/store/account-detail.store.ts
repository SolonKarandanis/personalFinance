import { computed, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { patchState, signalStore, withComputed, withMethods, withProps, withState } from '@ngrx/signals';
import {
  Account,
  AccountRepository,
  CreateAccountRequest,
  UpdateAccountRequest,
} from '../repositories/account.repository';
import { setError, setLoaded, setLoading, withCallState } from '@core/store/features/call-state.feature';
import { initialAccountDetailState, AccountDetailState } from './account-detail.state';

// Mutations are plain async methods rather than rxMethods, mirroring
// AuthStore.tryRestoreSession(): AccountsService needs to await a mutation
// before reloading AccountSearchStore's list resource, and a store can never
// depend on another store, so that sequencing has to happen in the service.
export const AccountDetailStore = signalStore(
  { providedIn: 'root' },
  withState<AccountDetailState>(initialAccountDetailState),
  withCallState(),
  withProps(() => ({
    accountRepository: inject(AccountRepository),
  })),
  withProps((store) => ({
    accountResource: store.accountRepository.getAccount(() => store.selectedDomainId() ?? undefined),
  })),
  withComputed(({ accountResource }) => ({
    account: computed(() => accountResource.value() ?? null),
    detailLoading: computed(() => accountResource.isLoading()),
  })),
  withMethods((state) => ({
    setSelectedDomainId(selectedDomainId: string | null): void {
      patchState(state, { selectedDomainId });
    },
    setLoadingState(): void {
      patchState(state, setLoading());
    },
    setLoadedState(): void {
      patchState(state, setLoaded());
    },
    setErrorState(error: string): void {
      patchState(state, setError(error));
    },
  })),
  withMethods((state) => {
    const { accountRepository } = state;
    return {
      async create(request: CreateAccountRequest): Promise<Account> {
        state.setLoadingState();
        try {
          const account = await firstValueFrom(accountRepository.createAccount(request));
          state.setLoadedState();
          return account;
        } catch (error) {
          state.setErrorState(errorMessage(error));
          throw error;
        }
      },
      async update(domainId: string, request: UpdateAccountRequest): Promise<Account> {
        state.setLoadingState();
        try {
          const account = await firstValueFrom(accountRepository.updateAccount(domainId, request));
          state.setLoadedState();
          return account;
        } catch (error) {
          state.setErrorState(errorMessage(error));
          throw error;
        }
      },
      async archive(domainId: string): Promise<Account> {
        state.setLoadingState();
        try {
          const account = await firstValueFrom(accountRepository.archiveAccount(domainId));
          state.setLoadedState();
          return account;
        } catch (error) {
          state.setErrorState(errorMessage(error));
          throw error;
        }
      },
    };
  }),
);

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'An unexpected error occurred';
}
