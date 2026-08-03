import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCard } from '@spartan-ng/helm/card';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmNativeSelect, HlmNativeSelectOption } from '@spartan-ng/helm/native-select';
import { TransactionsService } from './data/services/transactions.service';
import { Transaction } from './data/repositories/transaction.repository';

@Component({
  selector: 'app-transactions-page',
  imports: [RouterLink, HlmButton, HlmCard, HlmLabel, HlmNativeSelect, HlmNativeSelectOption],
  template: `
    <div class="p-4">
      <div class="mx-auto flex max-w-5xl flex-col gap-4">
        <div class="flex items-center justify-between">
          <h1 class="text-xl font-semibold">Transactions</h1>
          <div class="flex gap-2">
            <a hlmBtn variant="outline" routerLink="/transactions/transfer/new">New transfer</a>
            <a hlmBtn routerLink="/transactions/new">New transaction</a>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <label hlmLabel for="accountFilter">Account</label>
          <hlm-native-select
            [selectId]="'accountFilter'"
            [value]="transactionsService.accountFilter() ?? ''"
            (valueChange)="onFilterChange($event)"
          >
            <option value="" hlmNativeSelectOption>All accounts</option>
            @for (account of transactionsService.accounts(); track account.domainId) {
              <option [value]="account.domainId" hlmNativeSelectOption>{{ account.name }}</option>
            }
          </hlm-native-select>
        </div>

        @if (transactionsService.listLoading()) {
          <p class="text-sm text-muted-foreground">Loading…</p>
        } @else if (transactionsService.listError(); as error) {
          <p class="text-sm text-destructive">{{ error }}</p>
        } @else if (transactionsService.transactions().length === 0) {
          <div hlmCard class="p-6 text-sm text-muted-foreground">No transactions yet.</div>
        } @else {
          <div hlmCard class="overflow-x-auto p-0">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b text-left text-muted-foreground">
                  <th class="px-4 py-3 font-medium">Date</th>
                  <th class="px-4 py-3 font-medium">Description</th>
                  <th class="px-4 py-3 font-medium">Account</th>
                  <th class="px-4 py-3 font-medium">Category</th>
                  <th class="px-4 py-3 text-right font-medium">Amount</th>
                  <th class="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                @for (transaction of transactionsService.transactions(); track transaction.domainId) {
                  <tr class="border-b last:border-0">
                    <td class="px-4 py-3">{{ transaction.date }}</td>
                    <td class="px-4 py-3">
                      {{ transaction.description }}
                      @if (transaction.type === 'transfer') {
                        <span class="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                          Transfer
                        </span>
                      }
                    </td>
                    <td class="px-4 py-3">{{ accountName(transaction.accountDomainId) }}</td>
                    <td class="px-4 py-3">{{ categoryName(transaction.categoryDomainId) }}</td>
                    <td class="px-4 py-3 text-right">{{ transaction.amount }}</td>
                    <td class="px-4 py-3 text-right">
                      <span class="flex justify-end gap-2">
                        @if (transaction.type !== 'transfer') {
                          <a
                            [routerLink]="['/transactions', transaction.domainId, 'edit']"
                            class="text-sm text-primary underline"
                          >
                            Edit
                          </a>
                        }
                        <button hlmBtn variant="outline" size="sm" (click)="remove(transaction)">Delete</button>
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionsPageComponent {
  protected readonly transactionsService = inject(TransactionsService);

  protected onFilterChange(value: string | null | undefined): void {
    this.transactionsService.setAccountFilter(value || null);
  }

  protected accountName(domainId: string): string {
    return this.transactionsService.accounts().find((a) => a.domainId === domainId)?.name ?? '—';
  }

  protected categoryName(domainId: string | null): string {
    if (!domainId) {
      return '—';
    }
    return this.transactionsService.categories().find((c) => c.domainId === domainId)?.name ?? '—';
  }

  protected remove(transaction: Transaction): void {
    const message =
      transaction.type === 'transfer'
        ? 'Delete this transfer? Both legs will be removed.'
        : `Delete "${transaction.description}"?`;
    if (confirm(message)) {
      void this.transactionsService.deleteTransaction(transaction.domainId);
    }
  }
}
