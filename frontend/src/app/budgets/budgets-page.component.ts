import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCard } from '@spartan-ng/helm/card';
import { BudgetsService } from './data/services/budgets.service';
import { Budget, BudgetPeriod } from './data/repositories/budget.repository';

const PERIOD_LABELS: Record<BudgetPeriod, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

@Component({
  selector: 'app-budgets-page',
  imports: [RouterLink, HlmButton, HlmCard],
  template: `
    <div class="p-4">
      <div class="mx-auto flex max-w-3xl flex-col gap-4">
        <div class="flex items-center justify-between">
          <h1 class="text-xl font-semibold">Budgets</h1>
          <a hlmBtn routerLink="/budgets/new">New budget</a>
        </div>
        @if (budgetsService.listLoading()) {
          <p class="text-sm text-muted-foreground">Loading…</p>
        } @else if (budgetsService.listError(); as error) {
          <p class="text-sm text-destructive">{{ error }}</p>
        } @else if (budgetsService.budgets().length === 0) {
          <div hlmCard class="p-6 text-sm text-muted-foreground">No budgets yet.</div>
        } @else {
          @for (budget of budgetsService.budgets(); track budget.domainId) {
            <div hlmCard class="flex flex-col gap-3 p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium">{{ categoryName(budget.categoryDomainId) }}</p>
                  <p class="text-xs text-muted-foreground">{{ periodLabels[budget.period] }}</p>
                </div>
                <div class="flex gap-2">
                  <a
                    [routerLink]="['/budgets', budget.domainId, 'edit']"
                    class="text-sm text-primary underline"
                  >
                    Edit
                  </a>
                  <button hlmBtn variant="outline" size="sm" (click)="remove(budget)">Delete</button>
                </div>
              </div>
              <div class="flex flex-col gap-1">
                <div class="flex justify-between text-xs text-muted-foreground">
                  <span>{{ budget.currentPeriodStart }} – {{ budget.currentPeriodEnd }}</span>
                  <span [class.text-destructive]="isOverBudget(budget)">
                    {{ budget.currentPeriodSpent }} / {{ budget.amount }}
                  </span>
                </div>
                <div class="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    class="h-full rounded-full"
                    [class]="isOverBudget(budget) ? 'bg-destructive' : 'bg-primary'"
                    [style.width.%]="spentPercent(budget)"
                  ></div>
                </div>
              </div>
            </div>
          }
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetsPageComponent {
  protected readonly budgetsService = inject(BudgetsService);
  protected readonly periodLabels = PERIOD_LABELS;

  protected categoryName(domainId: string): string {
    return this.budgetsService.categories().find((c) => c.domainId === domainId)?.name ?? '—';
  }

  protected spentPercent(budget: Budget): number {
    const amount = Number(budget.amount);
    if (amount <= 0) {
      return 0;
    }
    return Math.min(100, (Number(budget.currentPeriodSpent) / amount) * 100);
  }

  protected isOverBudget(budget: Budget): boolean {
    return Number(budget.currentPeriodSpent) > Number(budget.amount);
  }

  protected remove(budget: Budget): void {
    if (confirm(`Delete the "${this.categoryName(budget.categoryDomainId)}" budget?`)) {
      void this.budgetsService.deleteBudget(budget.domainId);
    }
  }
}
