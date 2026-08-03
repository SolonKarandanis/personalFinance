import { computed, inject } from '@angular/core';
import { signalStore, withComputed, withMethods, withProps } from '@ngrx/signals';
import { BudgetRepository } from '../repositories/budget.repository';
import { resourceCallState } from '@core/store/features/resource-call-state';

// GET /budgets takes no query params — no search criteria to hold, so this
// store has no state of its own beyond the list httpResource.
export const BudgetSearchStore = signalStore(
  { providedIn: 'root' },
  withProps(() => {
    const budgetRepository = inject(BudgetRepository);
    const budgetsResource = budgetRepository.listBudgets();
    return { budgetRepository, budgetsResource };
  }),
  withComputed(({ budgetsResource }) => ({
    budgets: computed(() => budgetsResource.value() ?? []),
    ...resourceCallState(budgetsResource),
  })),
  withMethods(({ budgetsResource }) => ({
    reload(): void {
      budgetsResource.reload();
    },
  })),
);
