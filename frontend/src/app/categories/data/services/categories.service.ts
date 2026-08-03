import { inject, Injectable } from '@angular/core';
import { CategorySearchStore } from '../store/category-search.store';
import { CategoryDetailStore } from '../store/category-detail.store';
import { Category, CreateCategoryRequest, UpdateCategoryRequest } from '../repositories/category.repository';

// Combines the search and detail stores — neither store may depend on the
// other directly, so the "mutate, then refresh the list" sequencing lives
// here.
@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private readonly searchStore = inject(CategorySearchStore);
  private readonly detailStore = inject(CategoryDetailStore);

  readonly categories = this.searchStore.categories;
  readonly listLoading = this.searchStore.loading;
  readonly listError = this.searchStore.error;

  readonly category = this.detailStore.category;
  readonly detailLoading = this.detailStore.detailLoading;
  readonly saving = this.detailStore.loading;
  readonly saveError = this.detailStore.error;

  selectCategory(domainId: string | null): void {
    this.detailStore.setSelectedDomainId(domainId);
  }

  async createCategory(request: CreateCategoryRequest): Promise<Category> {
    const category = await this.detailStore.create(request);
    this.searchStore.reload();
    return category;
  }

  async updateCategory(domainId: string, request: UpdateCategoryRequest): Promise<Category> {
    const category = await this.detailStore.update(domainId, request);
    this.searchStore.reload();
    return category;
  }

  async deleteCategory(domainId: string): Promise<void> {
    await this.detailStore.remove(domainId);
    this.searchStore.reload();
  }
}
