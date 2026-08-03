import { computed, inject } from '@angular/core';
import { signalStore, withComputed, withProps } from '@ngrx/signals';
import { Category, CategoryRepository } from '../repositories/category.repository';
import { resourceCallState } from '@core/store/features/resource-call-state';

// Dropdown data for other domains' forms (e.g. picking a category for a
// transaction) — a different UI job from CategorySearchStore's "manage
// categories" list, so a separate store per the granularity rule, even
// though both wrap the same GET /categories endpoint.
export const CategoryLookupStore = signalStore(
  { providedIn: 'root' },
  withProps(() => {
    const categoryRepository = inject(CategoryRepository);
    const categoriesResource = categoryRepository.listCategories();
    return { categoryRepository, categoriesResource };
  }),
  withComputed(({ categoriesResource }) => {
    const callState = resourceCallState(categoriesResource);
    return {
      categories: computed<Category[]>(() => categoriesResource.value() ?? []),
      loading: callState.loading,
      loaded: callState.loaded,
      error: callState.error,
      status: callState.status,
    };
  }),
);
