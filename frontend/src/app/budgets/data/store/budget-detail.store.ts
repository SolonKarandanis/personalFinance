import { computed, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { patchState, signalStore, withComputed, withMethods, withProps, withState } from '@ngrx/signals';
import {
  Budget,
  BudgetRepository,
  CreateBudgetRequest,
  UpdateBudgetRequest,
} from '../repositories/budget.repository';
import { setError, setLoaded, setLoading, withCallState } from '@core/store/features/call-state.feature';
import { initialBudgetDetailState, BudgetDetailState } from './budget-detail.state';

// Mutations are plain async methods, same as the other Detail stores:
// BudgetsService needs to await a mutation before reloading
// BudgetSearchStore's list resource, and a store can never depend on
// another store, so that sequencing has to happen in the service.
export const BudgetDetailStore = signalStore(
  { providedIn: 'root' },
  withState<BudgetDetailState>(initialBudgetDetailState),
  withCallState(),
  withProps(() => ({
    budgetRepository: inject(BudgetRepository),
  })),
  withProps((store) => ({
    budgetResource: store.budgetRepository.getBudget(() => store.selectedDomainId() ?? undefined),
  })),
  withComputed(({ budgetResource }) => ({
    budget: computed(() => budgetResource.value() ?? null),
    detailLoading: computed(() => budgetResource.isLoading()),
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
    const { budgetRepository } = state;
    return {
      async create(request: CreateBudgetRequest): Promise<Budget> {
        state.setLoadingState();
        try {
          const budget = await firstValueFrom(budgetRepository.createBudget(request));
          state.setLoadedState();
          return budget;
        } catch (error) {
          state.setErrorState(errorMessage(error));
          throw error;
        }
      },
      async update(domainId: string, request: UpdateBudgetRequest): Promise<Budget> {
        state.setLoadingState();
        try {
          const budget = await firstValueFrom(budgetRepository.updateBudget(domainId, request));
          state.setLoadedState();
          return budget;
        } catch (error) {
          state.setErrorState(errorMessage(error));
          throw error;
        }
      },
      async remove(domainId: string): Promise<void> {
        state.setLoadingState();
        try {
          await firstValueFrom(budgetRepository.deleteBudget(domainId));
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
