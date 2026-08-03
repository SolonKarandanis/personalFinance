import { inject, Injectable } from '@angular/core';
import { BudgetSearchStore } from '../store/budget-search.store';
import { BudgetDetailStore } from '../store/budget-detail.store';
import { CategoryLookupStore } from '@app/categories/data/store/category-lookup.store';
import { Budget, CreateBudgetRequest, UpdateBudgetRequest } from '../repositories/budget.repository';

// Combines three stores — neither store may depend on another, so both the
// "mutate, then refresh the list" sequencing and the cross-domain category
// dropdown data (from CategoryLookupStore) live here.
@Injectable({ providedIn: 'root' })
export class BudgetsService {
  private readonly searchStore = inject(BudgetSearchStore);
  private readonly detailStore = inject(BudgetDetailStore);
  private readonly categoryLookupStore = inject(CategoryLookupStore);

  readonly budgets = this.searchStore.budgets;
  readonly listLoading = this.searchStore.loading;
  readonly listError = this.searchStore.error;

  readonly budget = this.detailStore.budget;
  readonly detailLoading = this.detailStore.detailLoading;
  readonly saving = this.detailStore.loading;
  readonly saveError = this.detailStore.error;

  readonly categories = this.categoryLookupStore.categories;

  selectBudget(domainId: string | null): void {
    this.detailStore.setSelectedDomainId(domainId);
  }

  async createBudget(request: CreateBudgetRequest): Promise<Budget> {
    const budget = await this.detailStore.create(request);
    this.searchStore.reload();
    return budget;
  }

  async updateBudget(domainId: string, request: UpdateBudgetRequest): Promise<Budget> {
    const budget = await this.detailStore.update(domainId, request);
    this.searchStore.reload();
    return budget;
  }

  async deleteBudget(domainId: string): Promise<void> {
    await this.detailStore.remove(domainId);
    this.searchStore.reload();
  }
}
