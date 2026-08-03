import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCard } from '@spartan-ng/helm/card';
import { CategoriesService } from './data/services/categories.service';
import { Category, CategoryType } from './data/repositories/category.repository';

interface CategoryNode {
  category: Category;
  children: Category[];
}

interface CategoryGroup {
  type: CategoryType;
  label: string;
  topLevel: CategoryNode[];
}

const TYPE_LABELS: Record<CategoryType, string> = {
  income: 'Income',
  expense: 'Expense',
  transfer: 'Transfer',
};

@Component({
  selector: 'app-categories-page',
  imports: [NgTemplateOutlet, RouterLink, HlmButton, HlmCard],
  template: `
    <div class="p-4">
      <div class="mx-auto flex max-w-3xl flex-col gap-4">
        <div class="flex items-center justify-between">
          <h1 class="text-xl font-semibold">Categories</h1>
          <a hlmBtn routerLink="/categories/new">New category</a>
        </div>
        @if (categoriesService.listLoading()) {
          <p class="text-sm text-muted-foreground">Loading…</p>
        } @else if (categoriesService.listError(); as error) {
          <p class="text-sm text-destructive">{{ error }}</p>
        } @else {
          @for (group of groups(); track group.type) {
            <div hlmCard class="p-4">
              <h2 class="mb-3 text-sm font-semibold text-muted-foreground uppercase">{{ group.label }}</h2>
              <ul class="flex flex-col gap-2">
                @for (node of group.topLevel; track node.category.domainId) {
                  <li>
                    <ng-container
                      *ngTemplateOutlet="row; context: { $implicit: node.category }"
                    ></ng-container>
                    @if (node.children.length > 0) {
                      <ul class="mt-2 ml-6 flex flex-col gap-2 border-l pl-4">
                        @for (child of node.children; track child.domainId) {
                          <li>
                            <ng-container
                              *ngTemplateOutlet="row; context: { $implicit: child }"
                            ></ng-container>
                          </li>
                        }
                      </ul>
                    }
                  </li>
                }
              </ul>
            </div>
          }
        }
      </div>
    </div>

    <ng-template #row let-category>
      <div class="flex items-center justify-between">
        <span class="flex items-center gap-2">
          @if (category.color) {
            <span class="inline-block size-2.5 rounded-full" [style.background-color]="category.color"></span>
          }
          @if (category.icon) {
            <span>{{ category.icon }}</span>
          }
          {{ category.name }}
          @if (category.isSystemDefault) {
            <span class="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">Default</span>
          }
        </span>
        @if (!category.isSystemDefault) {
          <span class="flex gap-2">
            <a [routerLink]="['/categories', category.domainId, 'edit']" class="text-sm text-primary underline">
              Edit
            </a>
            <button hlmBtn variant="outline" size="sm" (click)="remove(category)">Delete</button>
          </span>
        }
      </div>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriesPageComponent {
  protected readonly categoriesService = inject(CategoriesService);

  protected readonly groups = computed(() => groupCategories(this.categoriesService.categories()));

  protected remove(category: Category): void {
    if (confirm(`Delete "${category.name}"?`)) {
      void this.categoriesService.deleteCategory(category.domainId);
    }
  }
}

function groupCategories(categories: Category[]): CategoryGroup[] {
  return (Object.keys(TYPE_LABELS) as CategoryType[])
    .map((type) => {
      const inType = categories.filter((c) => c.type === type);
      const topLevel: CategoryNode[] = inType
        .filter((c) => c.parentDomainId === null)
        .map((category) => ({
          category,
          children: inType.filter((c) => c.parentDomainId === category.domainId),
        }));
      return { type, label: TYPE_LABELS[type], topLevel };
    })
    .filter((group) => group.topLevel.length > 0);
}
