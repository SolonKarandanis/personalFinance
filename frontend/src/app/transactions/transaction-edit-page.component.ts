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
import { TransactionsService } from './data/services/transactions.service';

const TRANSACTION_TYPES: { value: 'income' | 'expense'; label: string }[] = [
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
];

@Component({
  selector: 'app-transaction-edit-page',
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
        <h1 class="mb-6 text-xl font-semibold">{{ domainId() ? 'Edit transaction' : 'New transaction' }}</h1>
        <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">
          <div class="flex flex-col gap-1.5">
            <label hlmLabel for="account">Account</label>
            <hlm-native-select [selectId]="'account'" formControlName="accountDomainId">
              @for (account of transactionsService.selectableAccounts(); track account.domainId) {
                <option [value]="account.domainId" hlmNativeSelectOption>{{ account.name }}</option>
              }
            </hlm-native-select>
          </div>
          <div class="flex flex-col gap-1.5">
            <label hlmLabel for="type">Type</label>
            <hlm-native-select [selectId]="'type'" formControlName="type">
              @for (option of transactionTypes; track option.value) {
                <option [value]="option.value" hlmNativeSelectOption>{{ option.label }}</option>
              }
            </hlm-native-select>
          </div>
          <div class="flex flex-col gap-1.5">
            <label hlmLabel for="category">Category</label>
            <hlm-native-select [selectId]="'category'" formControlName="categoryDomainId">
              <option value="" hlmNativeSelectOption>None</option>
              @for (category of categoryOptions(); track category.domainId) {
                <option [value]="category.domainId" hlmNativeSelectOption>{{ category.name }}</option>
              }
            </hlm-native-select>
          </div>
          <div class="flex flex-col gap-1.5">
            <label hlmLabel for="amount">Amount</label>
            <input hlmInput id="amount" type="number" step="0.01" min="0.01" formControlName="amount" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label hlmLabel for="date">Date</label>
            <input hlmInput id="date" type="date" formControlName="date" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label hlmLabel for="description">Description</label>
            <input hlmInput id="description" type="text" formControlName="description" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label hlmLabel for="notes">Notes</label>
            <input hlmInput id="notes" type="text" formControlName="notes" />
          </div>
          @if (transactionsService.saveError(); as error) {
            <p class="text-sm text-destructive">{{ error }}</p>
          }
          <div class="flex gap-2">
            <button hlmBtn type="submit" [disabled]="form.invalid || transactionsService.saving()">
              {{ transactionsService.saving() ? 'Saving…' : 'Save' }}
            </button>
            <a hlmBtn variant="outline" routerLink="/transactions">Cancel</a>
          </div>
        </form>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionEditPageComponent {
  protected readonly transactionsService = inject(TransactionsService);
  protected readonly transactionTypes = TRANSACTION_TYPES;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly domainId = toSignal(this.route.paramMap.pipe(map((params) => params.get('domainId'))), {
    initialValue: this.route.snapshot.paramMap.get('domainId'),
  });

  protected readonly form = this.fb.nonNullable.group({
    accountDomainId: ['', Validators.required],
    type: ['expense' as 'income' | 'expense', Validators.required],
    categoryDomainId: [''],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    date: [today(), Validators.required],
    description: ['', Validators.required],
    notes: [''],
  });

  private readonly selectedType = toSignal(this.form.controls.type.valueChanges, {
    initialValue: this.form.controls.type.value,
  });

  // Reactively filtered by the currently-selected type, same pattern as
  // Category's parent-category dropdown.
  protected readonly categoryOptions = computed(() =>
    this.transactionsService.categories().filter((c) => c.type === this.selectedType()),
  );

  constructor() {
    effect(() => {
      this.transactionsService.selectTransaction(this.domainId());
    });

    // Only applies in create mode — type is disabled once editing, so this
    // would otherwise stomp on the just-loaded categoryDomainId the moment
    // patchValue below sets `type`.
    effect(() => {
      this.selectedType();
      if (!this.domainId()) {
        this.form.controls.categoryDomainId.setValue('');
      }
    });

    effect(() => {
      const transaction = this.transactionsService.transaction();
      // Transfers are never routed here (see decisions.md) — delete and
      // recreate instead, since PATCH only ever touches one leg.
      if (transaction && transaction.type !== 'transfer') {
        this.form.patchValue({
          accountDomainId: transaction.accountDomainId,
          type: transaction.type,
          categoryDomainId: transaction.categoryDomainId ?? '',
          amount: Math.abs(Number(transaction.amount)),
          date: transaction.date,
          description: transaction.description,
          notes: transaction.notes ?? '',
        });
        this.form.controls.accountDomainId.disable();
        this.form.controls.type.disable();
      }
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      return;
    }
    const { accountDomainId, type, categoryDomainId, amount, date, description, notes } = this.form.getRawValue();
    const domainId = this.domainId();
    const save = domainId
      ? this.transactionsService.updateTransaction(domainId, {
          categoryDomainId: categoryDomainId || undefined,
          amount,
          date,
          description,
          notes: notes || undefined,
        })
      : this.transactionsService.createTransaction({
          accountDomainId,
          type,
          categoryDomainId: categoryDomainId || undefined,
          amount,
          date,
          description,
          notes: notes || undefined,
        });
    save.then(() => this.router.navigateByUrl('/transactions'));
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
