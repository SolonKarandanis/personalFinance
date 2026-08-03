import { computed, inject, Injectable } from '@angular/core';
import { DashboardStore } from '../store/dashboard.store';
import { AccountLookupStore } from '@app/accounts/data/store/account-lookup.store';
import { BudgetSearchStore } from '@app/budgets/data/store/budget-search.store';
import { CategoryLookupStore } from '@app/categories/data/store/category-lookup.store';

// Combines four stores — the new DashboardStore plus three already-built
// Lookup/Search stores from other domains. Net worth and budgets-vs-actual
// need no new backend endpoint at all: they're just a different view over
// data those domains already expose (see decisions.md).
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly dashboardStore = inject(DashboardStore);
  private readonly accountLookupStore = inject(AccountLookupStore);
  private readonly budgetSearchStore = inject(BudgetSearchStore);
  private readonly categoryLookupStore = inject(CategoryLookupStore);

  readonly loading = this.dashboardStore.loading;
  readonly error = this.dashboardStore.error;

  readonly categoryBreakdown = this.dashboardStore.categoryBreakdown;
  readonly monthlyTrend = this.dashboardStore.monthlyTrend;

  readonly accounts = computed(() => this.accountLookupStore.accounts().filter((a) => !a.isArchived));
  // Formatted as a string, matching every other domain's currentBalance
  // convention (fixed 2 decimals, no currency symbol — see decisions.md).
  readonly netWorth = computed(() =>
    this.accounts().reduce((total, account) => total + Number(account.currentBalance), 0).toFixed(2),
  );

  readonly budgets = this.budgetSearchStore.budgets;

  categoryName(domainId: string): string {
    return this.categoryLookupStore.categories().find((c) => c.domainId === domainId)?.name ?? '—';
  }
}
