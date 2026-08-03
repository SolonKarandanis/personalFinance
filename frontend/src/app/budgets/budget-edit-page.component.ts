import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmCard } from '@spartan-ng/helm/card';
import { HlmNativeSelect, HlmNativeSelectOption } from '@spartan-ng/helm/native-select';
import { BudgetsService } from './data/services/budgets.service';
import { BudgetPeriod } from './data/repositories/budget.repository';

const BUDGET_PERIODS: { value: BudgetPeriod; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

@Component({
  selector: 'app-budget-edit-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    HlmButton,
    HlmInput,
    HlmLabel,
    HlmCard,
    HlmNativeSelect,
    HlmNativeSelectOption,
  ],
  template: `
    <div class="flex justify-center p-8">
      <div hlmCard class="w-full max-w-sm p-6">
        <h1 class="mb-6 text-xl font-semibold">{{ domainId() ? 'Edit budget' : 'New budget' }}</h1>
        <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">
          <div class="flex flex-col gap-1.5">
            <label hlmLabel for="category">Category</label>
            <hlm-native-select [selectId]="'category'" formControlName="categoryDomainId">
              @for (category of categoryOptions(); track category.domainId) {
                <option [value]="category.domainId" hlmNativeSelectOption>{{ category.name }}</option>
              }
            </hlm-native-select>
          </div>
          <div class="flex flex-col gap-1.5">
            <label hlmLabel for="period">Period</label>
            <hlm-native-select [selectId]="'period'" formControlName="period">
              @for (option of budgetPeriods; track option.value) {
                <option [value]="option.value" hlmNativeSelectOption>{{ option.label }}</option>
              }
            </hlm-native-select>
          </div>
          <div class="flex flex-col gap-1.5">
            <label hlmLabel for="amount">Amount</label>
            <input hlmInput id="amount" type="number" step="0.01" min="0.01" formControlName="amount" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label hlmLabel for="startDate">Start date</label>
            <input hlmInput id="startDate" type="date" formControlName="startDate" />
          </div>
          @if (budgetsService.saveError(); as error) {
            <p class="text-sm text-destructive">{{ error }}</p>
          }
          <div class="flex gap-2">
            <button hlmBtn type="submit" [disabled]="form.invalid || budgetsService.saving()">
              {{ budgetsService.saving() ? 'Saving…' : 'Save' }}
            </button>
            <a hlmBtn variant="outline" routerLink="/budgets">Cancel</a>
          </div>
        </form>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetEditPageComponent {
  protected readonly budgetsService = inject(BudgetsService);
  protected readonly budgetPeriods = BUDGET_PERIODS;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly domainId = toSignal(this.route.paramMap.pipe(map((params) => params.get('domainId'))), {
    initialValue: this.route.snapshot.paramMap.get('domainId'),
  });

  protected readonly form = this.fb.nonNullable.group({
    categoryDomainId: ['', Validators.required],
    period: ['monthly' as BudgetPeriod, Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    startDate: [today(), Validators.required],
  });

  // In create mode, exclude categories that already have a budget (pre-empts
  // the backend's 409). In edit mode the field is disabled, so show every
  // category — otherwise the currently-budgeted one (which IS in the
  // "already has a budget" set, being itself) wouldn't have a matching
  // <option> to render against.
  protected readonly categoryOptions = computed(() => {
    if (this.domainId()) {
      return this.budgetsService.categories();
    }
    const budgetedCategoryIds = new Set(this.budgetsService.budgets().map((b) => b.categoryDomainId));
    return this.budgetsService.categories().filter((c) => !budgetedCategoryIds.has(c.domainId));
  });

  constructor() {
    effect(() => {
      this.budgetsService.selectBudget(this.domainId());
    });

    effect(() => {
      const budget = this.budgetsService.budget();
      if (budget) {
        this.form.patchValue({
          categoryDomainId: budget.categoryDomainId,
          period: budget.period,
          amount: Number(budget.amount),
          startDate: budget.startDate,
        });
        this.form.controls.categoryDomainId.disable();
      }
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      return;
    }
    const { categoryDomainId, period, amount, startDate } = this.form.getRawValue();
    const domainId = this.domainId();
    const save = domainId
      ? this.budgetsService.updateBudget(domainId, { amount, period, startDate })
      : this.budgetsService.createBudget({ categoryDomainId, amount, period, startDate });
    save.then(() => this.router.navigateByUrl('/budgets'));
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
