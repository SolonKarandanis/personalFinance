import { computed, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { patchState, signalStore, withComputed, withMethods, withProps, withState } from '@ngrx/signals';
import {
  CreateTransactionRequest,
  CreateTransferRequest,
  Transaction,
  TransactionRepository,
  UpdateTransactionRequest,
} from '../repositories/transaction.repository';
import { setError, setLoaded, setLoading, withCallState } from '@core/store/features/call-state.feature';
import { initialTransactionDetailState, TransactionDetailState } from './transaction-detail.state';

// Mutations are plain async methods, same as AccountDetailStore/
// CategoryDetailStore: TransactionsService needs to await a mutation before
// reloading TransactionSearchStore's list resource, and a store can never
// depend on another store, so that sequencing has to happen in the service.
// Both create() and createTransfer() live here — a transfer is still "a
// Transaction" once it exists (see decisions.md).
export const TransactionDetailStore = signalStore(
  { providedIn: 'root' },
  withState<TransactionDetailState>(initialTransactionDetailState),
  withCallState(),
  withProps(() => ({
    transactionRepository: inject(TransactionRepository),
  })),
  withProps((store) => ({
    transactionResource: store.transactionRepository.getTransaction(
      () => store.selectedDomainId() ?? undefined,
    ),
  })),
  withComputed(({ transactionResource }) => ({
    transaction: computed(() => transactionResource.value() ?? null),
    detailLoading: computed(() => transactionResource.isLoading()),
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
    const { transactionRepository } = state;
    return {
      async create(request: CreateTransactionRequest): Promise<Transaction> {
        state.setLoadingState();
        try {
          const transaction = await firstValueFrom(transactionRepository.createTransaction(request));
          state.setLoadedState();
          return transaction;
        } catch (error) {
          state.setErrorState(errorMessage(error));
          throw error;
        }
      },
      async createTransfer(request: CreateTransferRequest): Promise<{ from: Transaction; to: Transaction }> {
        state.setLoadingState();
        try {
          const result = await firstValueFrom(transactionRepository.createTransfer(request));
          state.setLoadedState();
          return result;
        } catch (error) {
          state.setErrorState(errorMessage(error));
          throw error;
        }
      },
      async update(domainId: string, request: UpdateTransactionRequest): Promise<Transaction> {
        state.setLoadingState();
        try {
          const transaction = await firstValueFrom(transactionRepository.updateTransaction(domainId, request));
          state.setLoadedState();
          return transaction;
        } catch (error) {
          state.setErrorState(errorMessage(error));
          throw error;
        }
      },
      async remove(domainId: string): Promise<void> {
        state.setLoadingState();
        try {
          await firstValueFrom(transactionRepository.deleteTransaction(domainId));
          state.setLoadedState();
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
