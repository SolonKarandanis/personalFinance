import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmCard } from '@spartan-ng/helm/card';
import { HlmNativeSelect, HlmNativeSelectOption } from '@spartan-ng/helm/native-select';
import { TransactionsService } from './data/services/transactions.service';

@Component({
  selector: 'app-transaction-transfer-page',
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
        <h1 class="mb-6 text-xl font-semibold">New transfer</h1>
        <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">
          <div class="flex flex-col gap-1.5">
            <label hlmLabel for="fromAccount">From account</label>
            <hlm-native-select [selectId]="'fromAccount'" formControlName="fromAccountDomainId">
              @for (account of transactionsService.selectableAccounts(); track account.domainId) {
                <option [value]="account.domainId" hlmNativeSelectOption>{{ account.name }}</option>
              }
            </hlm-native-select>
          </div>
          <div class="flex flex-col gap-1.5">
            <label hlmLabel for="toAccount">To account</label>
            <hlm-native-select [selectId]="'toAccount'" formControlName="toAccountDomainId">
              @for (account of toAccountOptions(); track account.domainId) {
                <option [value]="account.domainId" hlmNativeSelectOption>{{ account.name }}</option>
              }
            </hlm-native-select>
          </div>
          <div class="flex flex-col gap-1.5">
            <label hlmLabel for="category">Category</label>
            <hlm-native-select [selectId]="'category'" formControlName="categoryDomainId">
              <option value="" hlmNativeSelectOption>None</option>
              @for (category of transferCategories(); track category.domainId) {
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
export class TransactionTransferPageComponent {
  protected readonly transactionsService = inject(TransactionsService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    fromAccountDomainId: ['', Validators.required],
    toAccountDomainId: ['', Validators.required],
    categoryDomainId: [''],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    date: [today(), Validators.required],
    description: ['', Validators.required],
    notes: [''],
  });

  private readonly fromAccount = toSignal(this.form.controls.fromAccountDomainId.valueChanges, {
    initialValue: this.form.controls.fromAccountDomainId.value,
  });

  // Reactively excludes whatever is currently picked as "from" — catches
  // the backend's "cannot transfer to the same account" 400 before submit.
  protected readonly toAccountOptions = computed(() =>
    this.transactionsService.selectableAccounts().filter((a) => a.domainId !== this.fromAccount()),
  );

  protected readonly transferCategories = computed(() =>
    this.transactionsService.categories().filter((c) => c.type === 'transfer'),
  );

  constructor() {
    // Clears a "to account" selection that just became invalid (same as
    // whichever account was just picked as "from").
    effect(() => {
      if (this.fromAccount() && this.form.controls.toAccountDomainId.value === this.fromAccount()) {
        this.form.controls.toAccountDomainId.setValue('');
      }
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      return;
    }
    const { fromAccountDomainId, toAccountDomainId, categoryDomainId, amount, date, description, notes } =
      this.form.getRawValue();
    this.transactionsService
      .createTransfer({
        fromAccountDomainId,
        toAccountDomainId,
        categoryDomainId: categoryDomainId || undefined,
        amount,
        date,
        description,
        notes: notes || undefined,
      })
      .then(() => this.router.navigateByUrl('/transactions'));
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
