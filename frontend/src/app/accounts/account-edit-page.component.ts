import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmCard } from '@spartan-ng/helm/card';
import { HlmNativeSelect, HlmNativeSelectOption } from '@spartan-ng/helm/native-select';
import { AccountsService } from './data/services/accounts.service';
import { AccountType } from './data/repositories/account.repository';

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'credit_card', label: 'Credit card' },
  { value: 'cash', label: 'Cash' },
  { value: 'investment', label: 'Investment' },
];

@Component({
  selector: 'app-account-edit-page',
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
        <h1 class="mb-6 text-xl font-semibold">{{ domainId() ? 'Edit account' : 'New account' }}</h1>
        <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">
          <div class="flex flex-col gap-1.5">
            <label hlmLabel for="name">Name</label>
            <input hlmInput id="name" type="text" formControlName="name" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label hlmLabel for="type">Type</label>
            <hlm-native-select [selectId]="'type'" formControlName="type">
              @for (option of accountTypes; track option.value) {
                <option [value]="option.value" hlmNativeSelectOption>{{ option.label }}</option>
              }
            </hlm-native-select>
          </div>
          <div class="flex flex-col gap-1.5">
            <label hlmLabel for="institution">Institution</label>
            <input hlmInput id="institution" type="text" formControlName="institution" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label hlmLabel for="initialBalance">Initial balance</label>
            <input hlmInput id="initialBalance" type="number" step="0.01" formControlName="initialBalance" />
          </div>
          @if (accountsService.saveError(); as error) {
            <p class="text-sm text-destructive">{{ error }}</p>
          }
          <div class="flex gap-2">
            <button hlmBtn type="submit" [disabled]="form.invalid || accountsService.saving()">
              {{ accountsService.saving() ? 'Saving…' : 'Save' }}
            </button>
            <a hlmBtn variant="outline" routerLink="/accounts">Cancel</a>
          </div>
        </form>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountEditPageComponent {
  protected readonly accountsService = inject(AccountsService);
  protected readonly accountTypes = ACCOUNT_TYPES;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly domainId = toSignal(this.route.paramMap.pipe(map((params) => params.get('domainId'))), {
    initialValue: this.route.snapshot.paramMap.get('domainId'),
  });

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    type: ['checking' as AccountType, Validators.required],
    institution: [''],
    initialBalance: [0],
  });

  constructor() {
    // Also fires with null for the "new account" route, resetting any
    // previously-selected account left over from an earlier edit — the
    // detail store is a root singleton, so this is what keeps the create
    // form from ever showing stale data.
    effect(() => {
      this.accountsService.selectAccount(this.domainId());
    });

    effect(() => {
      const account = this.accountsService.account();
      if (account) {
        this.form.patchValue({
          name: account.name,
          type: account.type,
          institution: account.institution ?? '',
          initialBalance: Number(account.initialBalance),
        });
      }
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      return;
    }
    const { name, type, institution, initialBalance } = this.form.getRawValue();
    const request = {
      name,
      type,
      institution: institution || undefined,
      initialBalance,
    };
    const domainId = this.domainId();
    const save = domainId
      ? this.accountsService.updateAccount(domainId, request)
      : this.accountsService.createAccount(request);
    save.then(() => this.router.navigateByUrl('/accounts'));
  }
}
