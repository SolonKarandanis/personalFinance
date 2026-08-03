import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withProps, withState } from '@ngrx/signals';
import { TransactionRepository } from '../repositories/transaction.repository';
import { resourceCallState } from '@core/store/features/resource-call-state';
import { initialTransactionSearchState, TransactionSearchState } from './transaction-search.state';

// The first Search store with real filter state — GET /transactions is the
// first list endpoint in this app that takes a query param. The filter
// signal feeds directly into the httpResource's request function, so
// changing it auto-refetches with no explicit "search" trigger (see
// decisions.md's "reactive/live filtering" note).
export const TransactionSearchStore = signalStore(
  { providedIn: 'root' },
  withState<TransactionSearchState>(initialTransactionSearchState),
  withProps(() => ({
    transactionRepository: inject(TransactionRepository),
  })),
  withProps((store) => ({
    transactionsResource: store.transactionRepository.listTransactions(
      () => store.accountDomainIdFilter() ?? undefined,
    ),
  })),
  withComputed(({ transactionsResource }) => ({
    transactions: computed(() => transactionsResource.value() ?? []),
    ...resourceCallState(transactionsResource),
  })),
  withMethods((state) => ({
    setAccountFilter(accountDomainId: string | null): void {
      patchState(state, { accountDomainIdFilter: accountDomainId });
    },
    reload(): void {
      state.transactionsResource.reload();
    },
  })),
);
