import { computed, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { patchState, signalStore, withComputed, withMethods, withProps, withState } from '@ngrx/signals';
import {
  Category,
  CategoryRepository,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '../repositories/category.repository';
import { setError, setLoaded, setLoading, withCallState } from '@core/store/features/call-state.feature';
import { initialCategoryDetailState, CategoryDetailState } from './category-detail.state';

// Mutations are plain async methods rather than rxMethods, same as
// AccountDetailStore: CategoriesService needs to await a mutation before
// reloading CategorySearchStore's list resource, and a store can never
// depend on another store, so that sequencing has to happen in the service.
export const CategoryDetailStore = signalStore(
  { providedIn: 'root' },
  withState<CategoryDetailState>(initialCategoryDetailState),
  withCallState(),
  withProps(() => ({
    categoryRepository: inject(CategoryRepository),
  })),
  withProps((store) => ({
    categoryResource: store.categoryRepository.getCategory(() => store.selectedDomainId() ?? undefined),
  })),
  withComputed(({ categoryResource }) => ({
    category: computed(() => categoryResource.value() ?? null),
    detailLoading: computed(() => categoryResource.isLoading()),
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
    const { categoryRepository } = state;
    return {
      async create(request: CreateCategoryRequest): Promise<Category> {
        state.setLoadingState();
        try {
          const category = await firstValueFrom(categoryRepository.createCategory(request));
          state.setLoadedState();
          return category;
        } catch (error) {
          state.setErrorState(errorMessage(error));
          throw error;
        }
      },
      async update(domainId: string, request: UpdateCategoryRequest): Promise<Category> {
        state.setLoadingState();
        try {
          const category = await firstValueFrom(categoryRepository.updateCategory(domainId, request));
          state.setLoadedState();
          return category;
        } catch (error) {
          state.setErrorState(errorMessage(error));
          throw error;
        }
      },
      async remove(domainId: string): Promise<void> {
        state.setLoadingState();
        try {
          await firstValueFrom(categoryRepository.deleteCategory(domainId));
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
