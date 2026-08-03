import { computed, inject } from '@angular/core';
import { signalStore, withComputed, withMethods, withProps } from '@ngrx/signals';
import { CategoryRepository } from '../repositories/category.repository';
import { resourceCallState } from '@core/store/features/resource-call-state';

// GET /categories takes no query params — no search criteria to hold, so
// this store has no state of its own beyond the list httpResource.
export const CategorySearchStore = signalStore(
  { providedIn: 'root' },
  withProps(() => {
    const categoryRepository = inject(CategoryRepository);
    const categoriesResource = categoryRepository.listCategories();
    return { categoryRepository, categoriesResource };
  }),
  withComputed(({ categoriesResource }) => ({
    categories: computed(() => categoriesResource.value() ?? []),
    ...resourceCallState(categoriesResource),
  })),
  withMethods(({ categoriesResource }) => ({
    reload(): void {
      categoriesResource.reload();
    },
  })),
);
